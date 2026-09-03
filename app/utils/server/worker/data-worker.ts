import type { BARS, BARSShort, VatsimStorage } from '../storage';
import { radarStorage } from '../storage';
import type {
    VatsimData,
    VatsimLiveDataMap,
} from '~/types/data/vatsim';
import updateVatsimExtendedPilots, {
    updateVatsimDataStorage,
    updateVatsimMandatoryDataStorage,
} from '~/utils/server/vatsim/update';
import { initQuestDB, questDBWrite } from '~/utils/server/questdb/client';
import { $fetch } from 'ofetch';
import { initKafka } from '~/utils/server/worker/kafka';
import { initWebsocket, wss } from '~/utils/server/vatsim/ws';
import { getPlanQuestDBDataForPilots, getShortQuestDBDataForPilots } from '~/utils/server/questdb/converters';
import { getRedis } from '~/utils/server/redis';
import { defineCronJob, getVATSIMIdentHeaders } from '~/utils/server';
import { initWholeBunchOfBackendTasks, navigraphUpdating } from '~/utils/server/tasks';
import { prisma } from '~/utils/server/prisma';

import { getFacilityByCallsign } from '~/utils/shared/vatsim';
import type { RadarNotam } from '~/utils/shared/vatsim';
import { getTransceiverData } from '~/utils/server/vatsim';

initWebsocket();
initQuestDB();

await initWholeBunchOfBackendTasks();
initKafka();

const redisPublisher = getRedis();

await defineCronJob('15 */2 * * *', async () => {
    if (!process.env.AERONAV_API_TOKEN) return;

    const response = await $fetch<{ success: boolean; data: { station: string; station_ap: string; station_mid: string; station_facility: string; frequency: string }[] }>('https://api.aero-nav.com/gng/positions?station_facility=CTR,FSS', {
        headers: {
            Authorization: `Bearer ${ process.env.AERONAV_API_TOKEN }`,
        },
        timeout: 1000 * 60,
        retry: 3,
    });

    if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response received:', response);
        return;
    }

    radarStorage.aeronavPositions = response.data.map(item => ({
        fir: item.station_ap,
        ml: item.station_mid,
        freq: item.frequency,
    }));

    console.info(`Aeronav Positions Update Complete`);
});

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
let lastCheck = 0;

let data: VatsimData | null = null;

let shortBars: BARSShort = {};

await defineCronJob('*/10 * * * * *', async () => {
    const data = await $fetch<BARS>('https://api.stopbars.com/all').catch(() => {});
    shortBars = {};

    if (!data) return;

    for (const stopbar of data?.stopbars ?? []) {
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

    if (!vatspy?.data || dataInProgress || Date.now() - dataLatestFinished < 1000 || navigraphUpdating) return;

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

    if (!vatspy?.data || dataProcessInProgress || !data || navigraphUpdating) return;

    try {
        dataProcessInProgress = true;

        const dataSnapshot = data;
        data = null;
        radarStorage.vatsim.data = dataSnapshot;

        const updateTimestamp = new Date(radarStorage.vatsim.data.general.update_timestamp!).getTime();
        radarStorage.vatsim.data.general.update_timestamp = new Date().toISOString();

        /*        radarStorage.vatsim.data!.controllers.push({
            cid: 123,
            name: 'Test',
            callsign: 'RJDG_CTR',
            frequency: '122.800',
            facility: 1,
            rating: 1,
            server: '',
            visual_range: 1,
            text_atis: ['RJBB 120.25'],
            last_updated: '',
            logon_time: '',
        });*/

        delete radarStorage.vatsim.data.general.version;
        delete radarStorage.vatsim.data.general.connected_clients;

        /* radarStorage.vatsim.data!.pilots.push({
            callsign: 'test',
            cid: 1,
            heading: 203,
            groundspeed: 140,
            altitude: 0,
            frequencies: [],
            last_updated: "",
            logon_time: "2025-12-27T18:35:44.876Z",
            military_rating: 0,
            name: "Test",
            pilot_rating: 0,
            qnh_i_hg: 0,
            qnh_mb: 0,
            server: "",
            transponder: "",
            flight_plan: {
                aircraft: 'B742/H-SDFHIRWXY/L',
                aircraft_faa: 'H/B742/Z',
                aircraft_short: 'B742',
                departure: 'PHNL',
                arrival: 'NSFA',
                altitude: '31000',
                route: 'OPIHI3 CARRP DCT DATBE/N0449F400 G347 PUPIS A592 SAMVU SAMVU2B',
            },
            longitude: -160.23102,
            latitude: 17.56167
        })*/

        radarStorage.vatsim.data!.pilots.forEach(pilot => {
            const newerData = radarStorage.vatsim.kafka.pilots[pilot.callsign];
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.pilots.add(pilot.callsign);

            objectAssign(pilot, {
                ...newerData,
                date: undefined,
                deleted: undefined,
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
            if (!prefile) return;
            const newerData = radarStorage.vatsim.kafka.prefiles[prefile.callsign];
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.prefiles.add(prefile.callsign);

            objectAssign(prefile, {
                ...newerData,
                date: undefined,
                deleted: undefined,
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
            const newerData = radarStorage.vatsim.kafka.atc[controller.callsign];
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.atc.add(controller.callsign);

            objectAssign(controller, {
                ...newerData,
                date: undefined,
                deleted: undefined,
            });
        });

        const length = radarStorage.vatsim.data!.controllers.length;
        const onlineCallsigns = new Set(radarStorage.vatsim.data!.controllers.map(x => x.callsign));

        const allowedDuplicatingFacilities = ['FSS', 'CTR', 'APP', 'DEP'];
        const allowedDuplicatingSectors = radarStorage.vatsim.sectorsDataset.filter(x => allowedDuplicatingFacilities.some(y => x.callsign.endsWith(y)));

        const staticFreqSectors: typeof allowedDuplicatingSectors = [];
        const dynamicFreqSectors: typeof allowedDuplicatingSectors = [];

        for (const sector of allowedDuplicatingSectors) {
            if (sector.region === 'JP' || sector.region === 'CN') {
                dynamicFreqSectors.push(sector);
            }
            else if (sector.region === 'AU' || sector.region === 'NZ' || !sector.region) {
                staticFreqSectors.push(sector);
            }
        }

        for (let i = 0; i < length; i++) {
            const controller = radarStorage.vatsim.data!.controllers[i];

            controller.frequencies = getTransceiverData(controller.callsign, true).frequencies;

            const controllerSplit = controller.callsign.split('_');
            if (controllerSplit.length <= 1) continue;

            // ZMA Ocean Area logic
            if (controller.callsign.startsWith('MIA_') && controllerSplit.length === 3) {
                // Change MIA_##_CTR -> ZMA_##_CTR if "no ocean area" included in controller info
                if (controller.text_atis?.join(' ').toLowerCase().includes('no ocean area')) {
                    radarStorage.vatsim.data.controllers.push({
                        ...controller,
                        callsign: `ZMA_${ controllerSplit[1] }_CTR`,
                        duplicatedBy: controller.callsign,
                    });

                    radarStorage.vatsim.data.controllers = radarStorage.vatsim.data.controllers.filter(
                        c => c.callsign !== `MIA_${ controllerSplit[1] }_CTR`,
                    );
                }
                // Sign on ZMO_##_CTR if "ocean area" included in controller info
                else if (controller.text_atis?.join(' ').toLowerCase().includes('ocean area')) {
                    radarStorage.vatsim.data.controllers.push({
                        ...controller,
                        callsign: `ZMO_${ controllerSplit[1] }_CTR`,
                        duplicated: true,
                        duplicatedBy: controller.callsign,
                    });
                }
            }

            // 1. Process AU/NZ duplication (Standard logic)
            const duplicatedSectors = staticFreqSectors.filter(x => {
                const freq = parseFloat(x.frequency).toString();

                return controller.text_atis?.some(
                    y => y.includes(freq),
                ) &&
                    controller.text_atis?.some(
                        y => y.split(' ').some(y => y.toUpperCase() === x.name),
                    );
            });

            if (duplicatedSectors?.length) {
                for (const sector of duplicatedSectors) {
                    const freq = parseFloat(sector.frequency).toString();
                    if (freq === controller.frequency || sector.frequency === controller.frequency) continue;

                    radarStorage.vatsim.data.controllers.push({
                        ...controller,
                        callsign: sector.callsign,
                        frequency: sector.frequency,
                        duplicated: true,
                        duplicatedBy: controller.callsign,
                    });
                }

                continue;
            }

            // VATJPN sector duplication
            if (dynamicFreqSectors.length > 0 && controller.text_atis?.length) {
                const atisText = controller.text_atis.join(' ');
                const mainFreqCanon = parseFloat(controller.frequency).toString();

                const extendedJpSectors = dynamicFreqSectors.filter(s => {
                    const nameRegex = new RegExp(`\\b${ s.name }\\b`, 'i');
                    return nameRegex.test(atisText);
                });

                if (extendedJpSectors.length > 0) {
                    const validFrequencies = new Set(extendedJpSectors.map(s => parseFloat(s.frequency).toString()));
                    validFrequencies.add(mainFreqCanon);

                    for (const sector of extendedJpSectors) {
                        const sectorFreqCanon = parseFloat(sector.frequency).toString();
                        if (sectorFreqCanon === mainFreqCanon || sector.frequency === controller.frequency) {
                            continue;
                        }

                        const pairRegex = new RegExp(`\\b${ sector.name }\\b\\s+\\b(1\\d{2}\\.\\d{1,3})\\b`, 'i');
                        const match = atisText.match(pairRegex);

                        if (match) {
                            const atisFreq = match[1];
                            const atisFreqCanon = parseFloat(atisFreq).toString();
                            const targetFrequency = validFrequencies.has(atisFreqCanon)
                                ? parseFloat(atisFreq).toFixed(3)
                                : controller.frequency;

                            if (sector.callsign === controller.callsign) continue;
                            if (onlineCallsigns.has(sector.callsign)) continue;

                            radarStorage.vatsim.data.controllers.push({
                                ...controller,
                                callsign: sector.callsign,
                                frequency: targetFrequency,
                                facility: getFacilityByCallsign(sector.callsign),
                                duplicated: true,
                                duplicatedBy: controller.callsign,
                            });
                        }
                    }
                }
            }
        }

        radarStorage.vatsim.data!.atis.forEach(controller => {
            const newerData = radarStorage.vatsim.kafka.atc[controller.callsign];
            if (!newerData || updateTimestamp > newerData.date) return;

            if (newerData.deleted) return toDelete.atc.add(controller.callsign);

            objectAssign(controller, newerData);
        });

        const pilotCallsigns = new Set(dataSnapshot.pilots.map(p => p?.callsign ?? ''));
        const atcCallsigns = new Set(dataSnapshot.controllers.map(c => c?.callsign ?? ''));
        const atisCallsigns = new Set(dataSnapshot.atis.map(a => a?.callsign ?? ''));
        const prefileCallsigns = new Set(dataSnapshot.prefiles.map(p => p?.callsign ?? ''));

        Object.keys(radarStorage.vatsim.kafka.pilots).forEach(k => {
            if (!pilotCallsigns.has(k)) delete radarStorage.vatsim.kafka.pilots[k];
        });

        Object.keys(radarStorage.vatsim.kafka.atc).forEach(k => {
            if (!atcCallsigns.has(k) && !atisCallsigns.has(k)) delete radarStorage.vatsim.kafka.atc[k];
        });

        Object.keys(radarStorage.vatsim.kafka.prefiles).forEach(k => {
            if (!prefileCallsigns.has(k)) delete radarStorage.vatsim.kafka.prefiles[k];
        });

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

        const regularData = excludeKeys(radarStorage.vatsim.data, {
            pilots: {
                server: true,
                qnh_i_hg: true,
                flight_plan: true,
                last_updated: true,
            },
            controllers: {
                visual_range: true,
                server: true,
                last_updated: true,
            },
            atis: {
                visual_range: true,
                server: true,
                last_updated: true,
            },
            prefiles: {
                flight_plan: true,
                last_updated: true,
            },
            observers: {
                frequency: true,
                facility: true,
                rating: true,
                text_atis: true,
                server: true,
                visual_range: true,
                flight_plan: true,
                last_updated: true,
            },
        });

        const pilotsMap = Object.fromEntries(radarStorage.vatsim.data!.pilots.map(x => [x.cid, x]));
        const prefilesMap = Object.fromEntries(radarStorage.vatsim.data!.prefiles.map(x => [x.cid, x]));

        radarStorage.vatsim.regularData = {
            ...regularData,
            pilots: regularData.pilots.map(x => {
                const origPilot = pilotsMap[x.cid];
                return {
                    ...x,
                    aircraft_short: origPilot?.flight_plan?.aircraft_short,
                    aircraft_faa: origPilot?.flight_plan?.aircraft_faa,
                    departure: origPilot?.flight_plan?.departure,
                    arrival: origPilot?.flight_plan?.arrival,
                    flight_rules: origPilot?.flight_plan?.flight_rules,
                };
            }),
            prefiles: regularData.prefiles.map(x => {
                const origPilot = prefilesMap[x.cid];
                return {
                    ...x,
                    aircraft_short: origPilot?.flight_plan?.aircraft_short,
                    aircraft_faa: origPilot?.flight_plan?.aircraft_faa,
                    departure: origPilot?.flight_plan?.departure,
                    arrival: origPilot?.flight_plan?.arrival,
                    flight_rules: origPilot?.flight_plan?.flight_rules,
                };
            }),
            bars: shortBars,
        };

        const notams = await prisma.notams.findMany({
            where: {
                active: true,
            },
        }) as RadarNotam[];

        radarStorage.vatsim.notam = radarStorage.vatsimNotam ?? notams.find(x => (!x.activeTo || new Date(x.activeTo).getTime() > Date.now()) && (!x.activeFrom || new Date(x.activeFrom).getTime() < Date.now())) ?? null;

        if (String(process.env.QUESTDB_ENABLE_WRITE) === 'true') {
            try {
                const plans = getPlanQuestDBDataForPilots();
                const pilots = getShortQuestDBDataForPilots();
                await questDBWrite(plans);
                await questDBWrite(pilots);
            }
            catch (error) {
                console.error('QuestDB write failed', error);
            }
        }

        if ((Date.now() - lastCheck) > 1000 * 15) {
            lastCheck = Date.now();
            wss.clients.forEach(ws => {
                ws.send('check');
                ws.failCheck ||= 0;
                ws.failCheck++;

                if (ws.failCheck >= 10) {
                    ws.terminate();
                }
            });
        }

        const shortDatafeed: VatsimLiveDataMap = {
            pilots: [],
            observers: [],
            controllers: [],
            atis: [],
            prefiles: [],
            map: {
                aircraft_faa: [],
                aircraft_short: [],
                airports: [],
                frequencies: [],
                status: [],
                codes: [],
            },
        };

        for (const pilot of radarStorage.vatsim.regularData!.pilots) {
            if (pilot.aircraft_faa && !shortDatafeed.map.aircraft_faa.includes(pilot.aircraft_faa)) shortDatafeed.map.aircraft_faa.push(pilot.aircraft_faa);
            if (pilot.aircraft_short && !shortDatafeed.map.aircraft_short.includes(pilot.aircraft_short)) shortDatafeed.map.aircraft_short.push(pilot.aircraft_short);
            if (pilot.departure && !shortDatafeed.map.airports.includes(pilot.departure)) shortDatafeed.map.airports.push(pilot.departure);
            if (pilot.arrival && !shortDatafeed.map.airports.includes(pilot.arrival)) shortDatafeed.map.airports.push(pilot.arrival);
            if (pilot.diverted_arrival && !shortDatafeed.map.airports.includes(pilot.diverted_arrival)) shortDatafeed.map.airports.push(pilot.diverted_arrival);
            if (pilot.diverted_origin && !shortDatafeed.map.airports.includes(pilot.diverted_origin)) shortDatafeed.map.airports.push(pilot.diverted_origin);
            if (pilot.airport && !shortDatafeed.map.airports.includes(pilot.airport)) shortDatafeed.map.airports.push(pilot.airport);
            if (pilot.status && !shortDatafeed.map.status.includes(pilot.status)) shortDatafeed.map.status.push(pilot.status);
            if (pilot.frequencies?.length) {
                for (const frequency of pilot.frequencies) {
                    if (!shortDatafeed.map.frequencies.includes(frequency)) shortDatafeed.map.frequencies.push(frequency);
                }
            }

            shortDatafeed.pilots.push({
                ci: pilot.cid,
                n: pilot.name,
                ca: pilot.callsign,
                rp: pilot.pilot_rating,
                rm: pilot.military_rating,
                la: pilot.latitude,
                lo: pilot.longitude,
                al: pilot.altitude,
                gs: pilot.groundspeed,
                ts: pilot.transponder,
                hd: pilot.heading,
                qn: pilot.qnh_mb,
                vs: pilot.vertical_speed,
                frq: pilot.frequencies.map(x => shortDatafeed.map.frequencies.indexOf(x)),
                sim: pilot.sim,
                tfa: !pilot.aircraft_faa ? undefined : shortDatafeed.map.aircraft_faa.indexOf(pilot.aircraft_faa),
                tsh: !pilot.aircraft_short ? undefined : shortDatafeed.map.aircraft_short.indexOf(pilot.aircraft_short),
                dep: !pilot.departure ? undefined : shortDatafeed.map.airports.indexOf(pilot.departure),
                arr: !pilot.arrival ? undefined : shortDatafeed.map.airports.indexOf(pilot.arrival),
                dv: pilot.diverted,
                dva: !pilot.diverted_arrival ? undefined : shortDatafeed.map.airports.indexOf(pilot.diverted_arrival),
                dvo: !pilot.diverted_origin ? undefined : shortDatafeed.map.airports.indexOf(pilot.diverted_origin),
                s: !pilot.status ? undefined : shortDatafeed.map.status.indexOf(pilot.status),
                dpd: pilot.depDist,
                dpg: pilot.toGoDist,
                ap: !pilot.airport ? undefined : shortDatafeed.map.airports.indexOf(pilot.airport),
                rl: pilot.flight_rules,
                lg: pilot.logon_time,
            });
        }

        for (const pilot of radarStorage.vatsim.regularData!.prefiles) {
            if (pilot.aircraft_faa && !shortDatafeed.map.aircraft_faa.includes(pilot.aircraft_faa)) shortDatafeed.map.aircraft_faa.push(pilot.aircraft_faa);
            if (pilot.aircraft_short && !shortDatafeed.map.aircraft_short.includes(pilot.aircraft_short)) shortDatafeed.map.aircraft_short.push(pilot.aircraft_short);
            if (pilot.departure && !shortDatafeed.map.airports.includes(pilot.departure)) shortDatafeed.map.airports.push(pilot.departure);
            if (pilot.arrival && !shortDatafeed.map.airports.includes(pilot.arrival)) shortDatafeed.map.airports.push(pilot.arrival);

            shortDatafeed.prefiles.push({
                ci: pilot.cid,
                n: pilot.name,
                ca: pilot.callsign,
                tfa: !pilot.aircraft_faa ? undefined : shortDatafeed.map.aircraft_faa.indexOf(pilot.aircraft_faa),
                tsh: !pilot.aircraft_short ? undefined : shortDatafeed.map.aircraft_short.indexOf(pilot.aircraft_short),
                dep: !pilot.departure ? undefined : shortDatafeed.map.airports.indexOf(pilot.departure),
                arr: !pilot.arrival ? undefined : shortDatafeed.map.airports.indexOf(pilot.arrival),
                rl: pilot.flight_rules,
            });
        }

        for (const atc of radarStorage.vatsim.regularData!.controllers) {
            if (atc.frequency && !shortDatafeed.map.frequencies.includes(atc.frequency)) shortDatafeed.map.frequencies.push(atc.frequency);
            if (atc.frequencies?.length) {
                for (const frequency of atc.frequencies) {
                    if (!shortDatafeed.map.frequencies.includes(frequency)) shortDatafeed.map.frequencies.push(frequency);
                }
            }

            shortDatafeed.controllers.push({
                ci: atc.cid,
                n: atc.name,
                ca: atc.callsign,
                fa: atc.facility,
                ra: atc.rating,
                atis: atc.text_atis,
                lg: atc.logon_time,
                bk: atc.booking,
                isBk: atc.isBooking,
                dp: atc.duplicated,
                dpBy: atc.duplicatedBy,
                fr: shortDatafeed.map.frequencies.indexOf(atc.frequency),
                frq: atc.frequencies?.map(x => shortDatafeed.map.frequencies.indexOf(x)),
            });
        }

        for (const atc of radarStorage.vatsim.regularData!.atis) {
            if (atc.atis_code && !shortDatafeed.map.codes.includes(atc.atis_code)) shortDatafeed.map.codes.push(atc.atis_code);
            if (atc.frequency && !shortDatafeed.map.frequencies.includes(atc.frequency)) shortDatafeed.map.frequencies.push(atc.frequency);
            if (atc.frequencies?.length) {
                for (const frequency of atc.frequencies) {
                    if (!shortDatafeed.map.frequencies.includes(frequency)) shortDatafeed.map.frequencies.push(frequency);
                }
            }

            shortDatafeed.atis.push({
                ci: atc.cid,
                n: atc.name,
                ca: atc.callsign,
                fa: atc.facility,
                ra: atc.rating,
                atis: atc.text_atis,
                lg: atc.logon_time,
                bk: atc.booking,
                isBk: atc.isBooking,
                dp: atc.duplicated,
                dpBy: atc.duplicatedBy,
                fr: shortDatafeed.map.frequencies.indexOf(atc.frequency),
                frq: atc.frequencies?.map(x => shortDatafeed.map.frequencies.indexOf(x)),
                co: shortDatafeed.map.codes.indexOf(atc.atis_code ?? ''),
            });
        }

        for (const atc of radarStorage.vatsim.regularData!.observers) {
            if (atc.frequencies?.length) {
                for (const frequency of atc.frequencies) {
                    if (!shortDatafeed.map.frequencies.includes(frequency)) shortDatafeed.map.frequencies.push(frequency);
                }
            }

            shortDatafeed.observers.push({
                ci: atc.cid,
                n: atc.name,
                ca: atc.callsign,
                frq: atc.frequencies?.map(x => shortDatafeed.map.frequencies.indexOf(x)),
                lg: atc.logon_time,
            });
        }

        radarStorage.vatsim.compactDatafeed = shortDatafeed;

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Redis publish Failed by timeout')), 5000);
            redisPublisher.publish('data', JSON.stringify({
                data: radarStorage.vatsim.data,
                regularData: radarStorage.vatsim.regularData,
                mandatoryData: radarStorage.vatsim.mandatoryData,
                extendedPilots: radarStorage.vatsim.extendedPilots,
                extendedPilotsMap: {},
                transceivers: radarStorage.vatsim.transceivers,
                notam: radarStorage.vatsim.notam,
                compactDatafeed: radarStorage.vatsim.compactDatafeed,
            } satisfies Omit<VatsimStorage, 'kafka' | 'sectorsDataset'>), err => {
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
