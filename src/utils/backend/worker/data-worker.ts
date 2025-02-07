import { radarStorage } from '../storage';
import type { VatsimData } from '~/types/data/vatsim';
import {
    updateAustraliaData, updateTransceivers,
    updateVatsimDataStorage,
    updateVatsimExtendedPilots, updateVatsimMandatoryDataStorage,
} from '~/utils/backend/vatsim/update';
import { getAirportsList, getATCBounds, getLocalATC } from '~/utils/data/vatsim';
import { influxDBWrite, initInfluxDB } from '~/utils/backend/influx/influx';
import { updateVatSpy } from '~/utils/backend/vatsim/vatspy';
import { $fetch } from 'ofetch';
import { initKafka } from '~/utils/backend/worker/kafka';
import { wss } from '~/utils/backend/vatsim/ws';
import { initNavigraph } from '~/utils/backend/navigraph-db';
import { updateSimAware } from '~/utils/backend/vatsim/simaware';
import { getPlanInfluxDataForPilots } from '~/utils/backend/influx/converters';
import { getRedis } from '~/utils/backend/redis';
import { defineCronJob, getVATSIMIdentHeaders } from '~/utils/backend';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import S3 from 'aws-sdk/clients/s3';
import { prisma } from '~/utils/backend/prisma';

initInfluxDB();
initKafka();
initNavigraph().catch(console.error);

const redisPublisher = getRedis();

function excludeKeys<S extends {
    [K in keyof D]?: D[K] extends Array<any> ? {
        [KK in keyof D[K][0]]?: true
    } : never
}, D extends VatsimData>(data: D, excluded: S): {
    [K in keyof D]: D[K] extends Array<any> ? Array<Omit<D[K][0], keyof S[K]>> : D[K]
} {
    const newData = {} as ReturnType<typeof excludeKeys<S, D>>;

    for (const key in data) {
        const items = data[key];
        const toExclude = excluded[key];
        if (!toExclude || !Array.isArray(items)) {
            newData[key] = data[key] as any;
            continue;
        }

        const excludedKeys = Object.keys(toExclude);

        newData[key] = items.map(item => Object.fromEntries(Object.entries(item).filter(([x]) => !excludedKeys.includes(x)))) as any;
    }

    return newData;
}

const toDelete = {
    pilots: new Set<string>(),
    atc: new Set<string>(),
    atis: new Set<string>(),
    prefiles: new Set<string>(),
};

function objectAssign(object: Record<string, any>, target: Record<string, any>) {
    for (const key in target) {
        if (target[key] === null || target[key] === undefined) continue;
        object[key] = target[key];
    }
}

let dataLatestFinished = 0;
let dataInProgress = false;
let dataProcessInProgress = false;

defineCronJob('15 * * * *', updateVatSpy);
defineCronJob('* * * * * *', updateTransceivers);
defineCronJob('15 * * * *', updateSimAware);
defineCronJob('15 * * * *', updateAustraliaData);

let s3: S3 | undefined;

const dbRegex = new RegExp('mysql:\\/\\/(?<user>.*):(?<password>.*)@(?<host>.*):(?<port>.*)\\/(?<db>.*)\\?');

defineCronJob('20 */2 * * *', async () => {
    if (import.meta.dev || !process.env.CF_R2_API) return;

    s3 ??= new S3({
        endpoint: process.env.CF_R2_API,
        accessKeyId: process.env.CF_R2_ACCESS_ID,
        secretAccessKey: process.env.CF_R2_ACCESS_TOKEN,
        signatureVersion: 'v4',
    });

    const {
        groups: {
            user,
            password,
            host,
            port,
            db,
        },
    } = dbRegex.exec(process.env.DATABASE_URL!)! as { groups: Record<string, string> };

    execSync(`mysqldump -u${ user } -p${ password } -h${ host } --compact --create-options --quick --tz-utc -P${ port } ${ db } > dump.sql`);

    const date = new Date();

    s3.upload({
        Bucket: 'backups',
        Expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)),
        Body: readFileSync(join(process.cwd(), 'dump.sql')),
        Key: `radar/${ date.getFullYear() }-${ date.getMonth() }-${ date.getDate() }-${ process.env.DOMAIN!.replace('https://', '').split(':')[0] }-${ date.getHours() }-${ date.getMinutes() }.sql`,
        ContentType: 'application/sql',
    }, (err, data) => {
        if (err) console.error(err);
        if (data) console.info('Backup completed', data.Location);
    });
});

defineCronJob('*/15 * * * *', async () => {
    if (!process.env.DATABASE_URL) return;

    await prisma.userToken.deleteMany({
        where: {
            refreshMaxDate: {
                lte: new Date(),
            },
        },
    });

    await prisma.auth.deleteMany({
        where: {
            createdAt: {
                lte: new Date(Date.now() - (1000 * 60 * 60)),
            },
        },
    });

    await prisma.userRequest.deleteMany({
        where: {
            createdAt: {
                lte: new Date(Date.now() - (1000 * 60 * 60)),
            },
        },
    });
});

let data: VatsimData | null = null;

defineCronJob('* * * * * *', async () => {
    if (!radarStorage.vatspy.data || dataInProgress || Date.now() - dataLatestFinished < 1000) return;

    try {
        dataInProgress = true;

        data = await $fetch<VatsimData>('https://data.vatsim.net/v3/vatsim-data.json', {
            parseResponse(responseText) {
                return JSON.parse(responseText);
            },
            headers: getVATSIMIdentHeaders(),
            timeout: 1000 * 30,
        });
    }
    catch (e) {
        console.error(e);
    }

    dataInProgress = false;
    dataLatestFinished = Date.now();
});

defineCronJob('* * * * * *', async () => {
    if (!radarStorage.vatspy.data || dataProcessInProgress || !data) return;

    try {
        dataProcessInProgress = true;

        radarStorage.vatsim.data = structuredClone(data);

        const updateTimestamp = new Date(radarStorage.vatsim.data.general.update_timestamp).getTime();
        radarStorage.vatsim.data.general.update_timestamp = new Date().toISOString();

        radarStorage.vatsim.data!.pilots.forEach(pilot => {
            const newerData = radarStorage.vatsim.kafka.pilots.find(x => x.callsign === pilot.callsign);
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.pilots.add(pilot.callsign);

            objectAssign(pilot, {
                ...newerData,
                flight_plan: undefined,
            });

            if (newerData.flight_plan) {
                if (pilot.flight_plan) {
                    objectAssign(pilot.flight_plan, newerData.flight_plan);
                }
                else {
                    pilot.flight_plan = newerData.flight_plan;
                }
            }
        });

        radarStorage.vatsim.data!.prefiles.forEach(prefile => {
            const newerData = radarStorage.vatsim.kafka.prefiles.find(x => x.callsign === prefile.callsign);
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.prefiles.add(prefile.callsign);

            objectAssign(prefile, {
                ...newerData,
                flight_plan: undefined,
            });

            if (newerData.flight_plan) {
                if (prefile.flight_plan) {
                    objectAssign(prefile.flight_plan, newerData.flight_plan);
                }
                else {
                    prefile.flight_plan = newerData.flight_plan;
                }
            }
        });

        radarStorage.vatsim.data!.controllers.forEach(controller => {
            const newerData = radarStorage.vatsim.kafka.atc.find(x => x.callsign === controller.callsign);
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.atc.add(controller.callsign);

            objectAssign(controller, newerData);
        });

        /* radarStorage.vatsim.data.controllers.push({
            callsign: 'LEMD_EN_APP',
            cid: 4,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3', 'Extending OCEAN', 'area'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'ENAL_APP',
            cid: 3,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3', 'Extending OCEAN', 'area'],
            visual_range: 0,
        });*/

        const length = radarStorage.vatsim.data!.controllers.length;

        const allowedAustraliaFacilities = ['CTR', 'APP', 'DEP'];
        const allowedAustraliaSectors = radarStorage.vatsim.australia.filter(x => allowedAustraliaFacilities.some(y => x.callsign.endsWith(y)));

        for (let i = 0; i < length; i++) {
            const controller = radarStorage.vatsim.data!.controllers[i];

            const controllerSplit = controller.callsign.split('_');
            if (controllerSplit.length <= 1) continue;

            if (controller.callsign.startsWith('MIA_') && controllerSplit.length === 3 && controller.text_atis?.join(' ').toLowerCase().includes('ocean area')) {
                radarStorage.vatsim.data.controllers.push({
                    ...controller,
                    callsign: `ZMO_${ controllerSplit[1] }_CTR`,
                });
            }

            const australiaSectors = allowedAustraliaSectors.filter(x => {
                const freq = parseFloat(x.frequency).toString();

                return controller.text_atis?.some(
                    y => y.includes(freq),
                ) &&
                    controller.text_atis?.some(
                        y => y.split(' ').some(y => y.toUpperCase() === x.name),
                    );
            });

            if (!australiaSectors) continue;

            for (const sector of australiaSectors) {
                const freq = parseFloat(sector.frequency).toString();
                if (freq === controller.frequency || sector.frequency === controller.frequency) continue;

                radarStorage.vatsim.data.controllers.push({
                    ...controller,
                    callsign: sector.callsign,
                    frequency: sector.frequency,
                });
            }
        }

        radarStorage.vatsim.data!.atis.forEach(controller => {
            const newerData = radarStorage.vatsim.kafka.atc.find(x => x.callsign === controller.callsign);
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.atc.add(controller.callsign);

            objectAssign(controller, newerData);
        });

        radarStorage.vatsim.kafka.pilots = radarStorage.vatsim.kafka.pilots.filter(x => radarStorage.vatsim.data!.pilots.some(y => y.callsign === x.callsign));
        radarStorage.vatsim.kafka.atc = radarStorage.vatsim.kafka.atc.filter(x => radarStorage.vatsim.data!.controllers.some(y => y.callsign === x.callsign) ||
            radarStorage.vatsim.data!.atis.some(y => y.callsign === x.callsign));
        radarStorage.vatsim.kafka.prefiles = radarStorage.vatsim.kafka.prefiles.filter(x => radarStorage.vatsim.data!.prefiles.some(y => y.callsign === x.callsign));

        if (toDelete.pilots.size) radarStorage.vatsim.data!.pilots = radarStorage.vatsim.data!.pilots.filter(x => !toDelete.pilots.has(x.callsign));
        if (toDelete.atc.size) radarStorage.vatsim.data!.controllers = radarStorage.vatsim.data!.controllers.filter(x => !toDelete.atc.has(x.callsign));
        if (toDelete.atis.size) radarStorage.vatsim.data!.atis = radarStorage.vatsim.data!.atis.filter(x => !toDelete.atis.has(x.callsign));
        if (toDelete.prefiles.size) radarStorage.vatsim.data!.prefiles = radarStorage.vatsim.data!.prefiles.filter(x => !toDelete.prefiles.has(x.callsign));

        toDelete.pilots.clear();
        toDelete.atc.clear();
        toDelete.atis.clear();
        toDelete.prefiles.clear();

        updateVatsimDataStorage();
        updateVatsimMandatoryDataStorage();

        await updateVatsimExtendedPilots();

        /* radarStorage.vatsim.data.controllers.push({
            callsign: 'ANK_W_CTR',
            cid: 3,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().CTR,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'PCT_APP',
            cid: 4,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });


        radarStorage.vatsim.data.atis.push({
            callsign: 'I90_D_APP',
            cid: 5,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'ACT_L_APP',
            cid: 6,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'FSM_TWR',
            cid: 1,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().TWR,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'CHI_X_APP',
            cid: 11,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });

        radarStorage.vatsim.data.controllers.push({
            callsign: 'SCT_APP',
            cid: 12,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });*/

        const regularData = excludeKeys(radarStorage.vatsim.data, {
            pilots: {
                server: true,
                qnh_i_hg: true,
                flight_plan: true,
                last_updated: true,
            },
            controllers: {
                server: true,
                last_updated: true,
            },
            atis: {
                server: true,
                last_updated: true,
            },
            prefiles: {
                flight_plan: true,
                last_updated: true,
            },
        });

        radarStorage.vatsim.regularData = {
            ...regularData,
            pilots: regularData.pilots.map(x => {
                const origPilot = radarStorage.vatsim.data!.pilots.find(y => y.cid === x.cid)!;
                return {
                    ...x,
                    aircraft_short: origPilot.flight_plan?.aircraft_short,
                    aircraft_faa: origPilot.flight_plan?.aircraft_faa,
                    departure: origPilot.flight_plan?.departure,
                    arrival: origPilot.flight_plan?.arrival,
                };
            }),
            prefiles: regularData.prefiles.map(x => {
                const origPilot = radarStorage.vatsim.data!.prefiles.find(y => y.cid === x.cid)!;
                return {
                    ...x,
                    aircraft_short: origPilot.flight_plan?.aircraft_short,
                    aircraft_faa: origPilot.flight_plan?.aircraft_faa,
                    departure: origPilot.flight_plan?.departure,
                    arrival: origPilot.flight_plan?.arrival,
                };
            }),
        };
        radarStorage.vatsim.firs = getATCBounds();
        radarStorage.vatsim.locals = getLocalATC();
        radarStorage.vatsim.airports = getAirportsList();

        if (String(process.env.INFLUX_ENABLE_WRITE) === 'true') {
            const data = getPlanInfluxDataForPilots();
            if (data.length) {
                influxDBWrite.writeRecords(data);

                await new Promise<void>(async (resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Failed by timeout')), 5000);
                    await influxDBWrite.flush(true).catch(console.error);
                    clearTimeout(timeout);
                    resolve();
                });
            }
        }

        wss.clients.forEach(ws => {
            ws.send('check');
            // @ts-expect-error Non-standard field
            ws.failCheck ??= ws.failCheck ?? 0;
            // @ts-expect-error Non-standard field
            ws.failCheck++;

            // @ts-expect-error Non-standard field
            if (ws.failCheck >= 10) {
                ws.terminate();
            }
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Failed by timeout')), 5000);
            redisPublisher.publish('data', JSON.stringify(radarStorage.vatsim), err => {
                clearTimeout(timeout);
                if (err) return reject(err);
                resolve();
            });
        });
    }
    catch (e) {
        console.error(e);
    }
    finally {
        dataProcessInProgress = false;
    }
});
