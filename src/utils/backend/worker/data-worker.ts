import { createGzip } from 'node:zlib';
import { CronJob } from 'cron';
import { radarStorage } from '../storage';
import type { VatsimData, VatsimTransceiver } from '~/types/data/vatsim';
import {
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
import { getPlanInfluxDataForPilots } from '~/utils/backend/influx/converters';
import { redis } from '~/utils/backend/redis';

initInfluxDB();
initKafka();
initNavigraph().catch(console.error);

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

CronJob.from({
    cronTime: '15 * * * *',
    runOnInit: true,
    start: true,
    onTick: async () => {
        await updateVatSpy();
    },
});

let transceiversInProgress = false;

CronJob.from({
    cronTime: '* * * * * *',
    start: true,
    runOnInit: true,
    onTick: async () => {
        if (!radarStorage.vatspy.data || transceiversInProgress) return;
        try {
            transceiversInProgress = true;
            radarStorage.vatsim.transceivers = await $fetch<VatsimTransceiver[]>('https://data.vatsim.net/v3/transceivers-data.json', {
                parseResponse(responseText) {
                    return JSON.parse(responseText);
                },
                timeout: 1000 * 30,
            });
        }
        catch (e) {
            console.error(e);
        }
        finally {
            transceiversInProgress = false;
        }
    },
});

let data: string | null = null;

CronJob.from({
    cronTime: '* * * * * *',
    start: true,
    runOnInit: true,
    onTick: async () => {
        if (!radarStorage.vatspy.data || dataInProgress || Date.now() - dataLatestFinished < 1000) return;

        try {
            dataInProgress = true;

            data = await $fetch('https://data.vatsim.net/v3/vatsim-data.json', {
                responseType: 'text',
                timeout: 1000 * 30,
            });
        }
        catch (e) {
            console.error(e);
        }

        dataInProgress = false;
        dataLatestFinished = Date.now();
    },
});

CronJob.from({
    cronTime: '* * * * * *',
    start: true,
    runOnInit: true,
    onTick: async () => {
        if (!radarStorage.vatspy.data || dataProcessInProgress || !data) return;

        try {
            dataProcessInProgress = true;

            radarStorage.vatsim.data = JSON.parse(data) as VatsimData;

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
                callsign: 'ULLL_R_CTR',
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
                callsign: 'ULLL_R5_CTR',
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
            });*/

            const regularData = excludeKeys(radarStorage.vatsim.data, {
                pilots: {
                    server: true,
                    transponder: true,
                    qnh_i_hg: true,
                    flight_plan: true,
                    last_updated: true,
                    logon_time: true,
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
                        const timeout = setTimeout(() => reject('Failed by timeout'), 5000);
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
                const timeout = setTimeout(() => reject('Failed by timeout'), 5000);
                redis.publish('data', JSON.stringify(radarStorage.vatsim), err => {
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
    },
});
