import { radarStorage } from '../storage';
import type { BARSShort, BARS } from '../storage';
import type { VatsimData } from '~/types/data/vatsim';
import {
    updateVatsimDataStorage,
    updateVatsimExtendedPilots, updateVatsimMandatoryDataStorage,
} from '~/utils/backend/vatsim/update';
import { getAirportsList, getATCBounds, getLocalATC } from '~/utils/data/vatsim';
import { influxDBWriteMain, influxDBWritePlans, initInfluxDB } from '~/utils/backend/influx/influx';
import { $fetch } from 'ofetch';
import { initKafka } from '~/utils/backend/worker/kafka';
import { initWebsocket, wss } from '~/utils/backend/vatsim/ws';
import { initNavigraph } from '~/utils/backend/navigraph-db';
import { getPlanInfluxDataForPilots, getShortInfluxDataForPilots } from '~/utils/backend/influx/converters';
import { getRedis } from '~/utils/backend/redis';
import { defineCronJob, getVATSIMIdentHeaders } from '~/utils/backend';
import { initWholeBunchOfBackendTasks } from '~/utils/backend/tasks';
import { getLocalText, isDebug } from '~/utils/backend/debug';

initWebsocket();
initInfluxDB();
initKafka();
initNavigraph().catch(console.error);

initWholeBunchOfBackendTasks();

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

let data: VatsimData | null = null;

let shortBars: BARSShort = {};

await defineCronJob('*/10 * * * * *', async () => {
    const data = await $fetch<BARS>('https://api.stopbars.com/all').catch();
    shortBars = {};

    for (const stopbar of data.stopbars ?? []) {
        try {
            shortBars[stopbar.airportICAO] ??= [];
            shortBars[stopbar.airportICAO].push({
                runway: stopbar.runway, bars: Object.entries(JSON.parse(stopbar.bars)) as [string, boolean][],
            });
        }
        catch { /* empty */ }
    }
});

defineCronJob('* * * * * *', async () => {
    const vatspy = radarStorage.vatspy;

    if (!vatspy?.data || dataInProgress || Date.now() - dataLatestFinished < 1000) return;

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

    /* data?.pilots.push({
        cid: 10000,
            name: "Dummy",
            callsign: "DELTA",
            server: "Nah ah",
            pilot_rating: 1,
            military_rating: 0,
            latitude: 48.137154,
            longitude: 11.576124,
            altitude: 10000,
            groundspeed: 100,
            transponder: "7700",
            heading: 360,
            qnh_i_hg: 100,
            qnh_mb: 100,
            flight_plan: {
                flight_rules: 'I',
                aircraft: "C170",
                aircraft_faa: "",
                aircraft_short: "",
                departure: "EDDM",
                cruise_tas: "",
                altitude: "10000",
                arrival: "EDDH",
                alternate: "EDDK",
                deptime: "",
                enroute_time: "",
                fuel_time: "",
                remarks: "DUMMY",
                route: "",
                revision_id: 1,
                assigned_transponder: "7700",
                locked: false,
                diverted: true,
                diverted_arrival: "EDDV",
                diverted_origin: "EDDH",
            },
            logon_time: "",
            last_updated: "",
            frequencies: ["122.800"],
            sim: "MSFS",
            icon: "c17"
    });*/

    dataInProgress = false;
    dataLatestFinished = Date.now();
});

defineCronJob('* * * * * *', async () => {
    const vatspy = radarStorage.vatspy;

    if (!vatspy?.data || dataProcessInProgress || !data) return;

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

        const localControllers = isDebug() && getLocalText('controllers.json');

        if (localControllers) {
            radarStorage.vatsim.data.controllers = radarStorage.vatsim.data.controllers.concat(JSON.parse(localControllers)).filter(x => !x.callsign.endsWith('ATIS'));
            radarStorage.vatsim.data.atis = radarStorage.vatsim.data.atis.concat(JSON.parse(localControllers)).filter(x => x.callsign.endsWith('ATIS'));
        }

        /*        radarStorage.vatsim.data.controllers.push({
            callsign: 'MCO_APP',
            cid: 6,
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

        radarStorage.vatsim.data.atis.push({
            callsign: 'MCO_ATIS',
            cid: 55,
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
            callsign: 'MCO_W_TWR',
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
            callsign: 'MCO_W_GND',
            cid: 44,
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
            callsign: 'MCO_W_GND',
            cid: 10,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().GND,
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
            callsign: 'MCO_E1_APP',
            cid: 11,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().GND,
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
            callsign: 'MCO_E2_APP',
            cid: 11,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().GND,
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
            callsign: 'PHX_A_APP',
            cid: 2,
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
            callsign: 'A90_APP',
            cid: 1,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
            frequency: '122.122',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3', 'Extending OCEAN', 'area'],
            visual_range: 0,
        }); */

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
            callsign: 'ULLL_R_CTR',
            cid: 3,
            facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().CTR,
            frequency: '135.600',
            last_updated: '',
            logon_time: '',
            name: '',
            rating: 0,
            server: '',
            text_atis: ['test3'],
            visual_range: 0,
        });*/

        /*

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
            bars: shortBars,
        };
        radarStorage.vatsim.firs = await getATCBounds();
        radarStorage.vatsim.locals = await getLocalATC();
        radarStorage.vatsim.airports = await getAirportsList();

        if (String(process.env.INFLUX_ENABLE_WRITE) === 'true') {
            const plans = getPlanInfluxDataForPilots();
            const pilots = getShortInfluxDataForPilots();
            if (plans.length) {
                influxDBWritePlans.writeRecords(plans);

                await new Promise<void>(async (resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Influx plans write Failed by timeout')), 5000);
                    await influxDBWritePlans.flush(true).catch(console.error);
                    clearTimeout(timeout);
                    resolve();
                }).catch(console.error);
            }

            if (pilots.length) {
                influxDBWriteMain.writeRecords(pilots);

                await new Promise<void>(async (resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Influx pilots write Failed by timeout')), 5000);
                    await influxDBWriteMain.flush(true).catch(console.error);
                    clearTimeout(timeout);
                    resolve();
                }).catch(console.error);
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
            const timeout = setTimeout(() => reject(new Error('Redis publish Failed by timeout')), 5000);
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
