import { getTransceiverData } from '~/utils/backend/vatsim/index';
import { useFacilitiesIds, getFacilityByCallsign } from '~/utils/data/vatsim';
import type { RadarDataAirline, RadarDataAirlineAll, RadarDataAirlinesList } from '~/utils/backend/storage';
import { radarStorage } from '~/utils/backend/storage';
import { wss } from '~/utils/backend/vatsim/ws';
import type {
    VatsimExtendedPilot,
    VatsimMandatoryData,
    VatsimShortenedAircraft,
    VatsimTransceiver,
    VatsimBookingData,
    VatsimBooking,
    VatsimDivision,
    VatsimSubDivision,
    VatsimShortenedController, VatsimController,
} from '~/types/data/vatsim';
import { getAircraftIcon } from '~/utils/icons';
import { getNavigraphGates } from '~/utils/backend/navigraph';
import { checkIsPilotInGate, getPilotTrueAltitude } from '~/utils/shared/vatsim';
import {
    calculateArrivalTime,
    calculateDistanceInNauticalMiles,
    calculateProgressPercentage,
} from '~/utils/shared/flight';
import type { NavigraphGate } from '~/types/data/navigraph';
import { getFirsPolygons } from '~/utils/backend/vatsim/vatspy';
import { $fetch } from 'ofetch';
import { XMLParser } from 'fast-xml-parser';
import { getVATSIMIdentHeaders } from '~/utils/backend';
import { setRedisData } from '~/utils/backend/redis';
import { isDebug } from '~/utils/backend/debug';

export function updateVatsimDataStorage() {
    const data = radarStorage.vatsim.data!;

    data.pilots = data.pilots.map(x => {
        const coords = [x.longitude, x.latitude];
        const transceiver = getTransceiverData(x.callsign);

        return {
            ...x,
            longitude: coords[0],
            latitude: coords[1],
            frequencies: transceiver.frequencies,
        };
    }).filter((x, index) => x && !data.pilots.some((y, yIndex) => y && y.cid === x.cid && yIndex < index));

    data.general.sups = data.controllers.filter(x => x.rating === 11);
    data.general.adm = data.controllers.filter(x => x.rating === 12 && x.frequency === '199.998');
    data.general.supsCount = data.general.sups.length;
    data.general.admCount = data.general.adm.length;
    data.general.onlineWSUsers = wss.clients.size;

    data.prefiles = data.prefiles.filter((x, index) => x && !data.pilots.some(y => y && x.cid === y.cid) && !data.prefiles.some((y, yIndex) => y && y.cid === x.cid && yIndex > index));

    const positions = useFacilitiesIds();

    const observers: VatsimController[] = [];

    data.controllers = data.controllers.filter(controller => {
        if (controller.facility === positions.OBS) {
            observers.push(controller);
            return false;
        }
        let postfix = controller.callsign.split('_').slice(-1)[0];
        if (postfix === 'DEP') postfix = 'APP';
        if (postfix === 'RMP') postfix = 'GND';
        controller.facility = positions[postfix as keyof typeof positions] ?? -1;
        return controller.facility !== -1 && controller.facility !== positions.OBS;
    });

    data.observers = observers;
}

export function updateVatsimMandatoryDataStorage() {
    const data = radarStorage.vatsim.data!;

    const newData: VatsimMandatoryData = {
        timestamp: data.general.update_timestamp,
        timestampNum: new Date(data.general.update_timestamp).getTime(),
        serverTime: Date.now(),
        pilots: [],
        controllers: [],
        atis: [],
    };

    for (const pilot of data.pilots) {
        const coords = [pilot.longitude, pilot.latitude];
        newData.pilots.push([pilot.cid, coords[0], coords[1], getAircraftIcon(pilot).icon, pilot.heading]);
    }

    // Maybe no need to implement
    // newData.controllers = data.controllers.map(x => [x.cid, x.callsign, x.frequency, x.facility]);
    // newData.atis = data.atis.map(x => [x.cid, x.callsign, x.frequency, x.facility]);

    radarStorage.vatsim.mandatoryData = newData;
}

const gates: Record<string, NavigraphGate[] | undefined> = {};

async function getCachedGates(icao: string): Promise<NavigraphGate[]> {
    const existing = gates[icao];
    if (existing) return existing;

    gates[icao] = await getNavigraphGates({
        user: null,
        icao: icao,
    }).catch(console.error) || undefined;

    return gates[icao] ?? [];
}

export async function updateVatsimExtendedPilots() {
    const vatspy = (radarStorage.vatspy)!;

    const firsPolygons = await getFirsPolygons();

    const firsList = firsPolygons.map(({
        icao,
        featureId,
        polygon,
    }) => ({
        controllers: radarStorage.vatsim.firs.filter(
            x => x.controller && x.firs.some(x => x.icao === icao && x.boundaryId === featureId),
        ),
        polygon,
    })).filter(x => x.controllers.length);

    radarStorage.vatsim.extendedPilots = [];
    const updatePilots: { [key: string]: VatsimExtendedPilot } = {};

    const pilotsToProcess: {
        pilot: VatsimExtendedPilot;
        origPilot: VatsimShortenedAircraft;

        controllers?: Set<string>;
    }[] = radarStorage.vatsim.data!.pilots.map(pilot => ({
        pilot: structuredClone(pilot),
        origPilot: pilot,
    }));

    for (const fir of firsList.map(x => ({
        controllers: x.controllers.flatMap(x => x.controller?.callsign),
        polygon: x.polygon,
    }))) {
        for (const pilot of pilotsToProcess) {
            if (fir.polygon.intersectsCoordinate([pilot.pilot.longitude, pilot.pilot.latitude])) {
                pilot.controllers ??= new Set();

                fir.controllers.map(x => pilot.controllers!.add(x));
            }
        }
    }

    for (const {
        pilot: extendedPilot,
        origPilot,
        controllers,
    } of pilotsToProcess) {
        const groundDep = radarStorage.vatsim.airports.find(x => x.aircraft.groundDep?.includes(extendedPilot.cid));
        const groundArr = radarStorage.vatsim.airports.find(x => x.aircraft.groundArr?.includes(extendedPilot.cid));

        if (groundDep) {
            extendedPilot.airport = groundDep.icao;
            const gates = await getCachedGates(groundDep.icao);

            const check = gates && checkIsPilotInGate(extendedPilot, gates);
            if ((check?.truly || check?.maybe) && extendedPilot.groundspeed === 0) {
                extendedPilot.status = 'depGate';
            }
            else {
                extendedPilot.status = 'depTaxi';
            }

            extendedPilot.isOnGround = true;
        }
        else if (groundArr) {
            extendedPilot.airport = groundArr.icao;
            const gates = await getCachedGates(groundArr.icao);

            if (!gates) return;

            const check = checkIsPilotInGate(extendedPilot, gates);
            if ((check?.truly || check?.maybe) && extendedPilot.groundspeed === 0) {
                extendedPilot.status = 'arrGate';
            }
            else {
                extendedPilot.status = 'arrTaxi';
            }

            extendedPilot.isOnGround = true;
        }

        let totalDist: number | null = null;

        const dep = extendedPilot.flight_plan?.departure && vatspy.data?.keyAirports.realIcao[extendedPilot.flight_plan.departure];
        const arr = extendedPilot.flight_plan?.arrival && vatspy.data?.keyAirports.realIcao[extendedPilot.flight_plan.arrival];

        if (dep && arr) {
            const pilotCoords = [extendedPilot.longitude, extendedPilot.latitude];
            const depCoords = [dep.lon, dep.lat];
            const arrCoords = [arr.lon, arr.lat];

            totalDist = calculateDistanceInNauticalMiles(depCoords, arrCoords);
            extendedPilot.depDist = calculateDistanceInNauticalMiles(depCoords, pilotCoords);
            if (extendedPilot.status !== 'arrGate' && extendedPilot.status !== 'arrTaxi') {
                extendedPilot.toGoDist = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
                extendedPilot.toGoPercent = calculateProgressPercentage(pilotCoords, depCoords, arrCoords);
                if (extendedPilot.toGoPercent < 0) extendedPilot.toGoPercent = 0;
                extendedPilot.toGoTime = calculateArrivalTime(pilotCoords, arrCoords, extendedPilot.groundspeed).getTime();

                if (extendedPilot.toGoDist < 100) {
                    extendedPilot.airport = arr.icao;
                    if (!extendedPilot.status && extendedPilot.toGoDist < 40) {
                        extendedPilot.status = 'arriving';
                    }
                }
                else if (extendedPilot.depDist < 40) {
                    extendedPilot.airport = dep.icao;
                    if (!extendedPilot.status) {
                        extendedPilot.status = 'departed';
                    }
                }
            }
        }

        if (extendedPilot.flight_plan?.altitude) {
            if (Number(extendedPilot.flight_plan?.altitude) < 1000) extendedPilot.flight_plan.altitude = (Number(extendedPilot.flight_plan?.altitude) * 100).toString();

            if (extendedPilot.flight_plan.route) {
                const routeRegex = /(?<waypoint>([A-Z0-9]+))\/([A-Z0-9]+?)(?<level>([FS])([0-9]{2,4}))/g;

                let result: RegExpExecArray | null;
                while ((result = routeRegex.exec(extendedPilot.flight_plan.route)) !== null) {
                    if (!result?.groups?.waypoint || !result.groups.level) continue;
                    extendedPilot.stepclimbs ??= [];

                    const level = result.groups.level;
                    const numLevel = Number(level.slice(1, level.length));
                    let ft = numLevel * 100;
                    if (level.startsWith('S')) ft = numLevel * 10 * 3.2808;

                    if (extendedPilot.stepclimbs[extendedPilot.stepclimbs.length - 1]?.level !== numLevel) {
                        extendedPilot.stepclimbs.push({
                            waypoint: result.groups.waypoint,
                            measurement: level.startsWith('S') ? 'M' : 'FT',
                            level: numLevel,
                            ft,
                        });
                    }
                }
            }

            const pilotAlt = getPilotTrueAltitude(extendedPilot) + 300;
            if (pilotAlt >= Number(extendedPilot.flight_plan?.altitude)) extendedPilot.status = 'cruising';

            if (extendedPilot.stepclimbs?.length &&
                !extendedPilot.isOnGround &&
                getPilotTrueAltitude(extendedPilot) + 300 >= extendedPilot.stepclimbs.toSorted((a, b) => a.ft - b.ft)[0].ft
            ) {
                extendedPilot.status = 'cruising';
            }
            else if (!extendedPilot.isOnGround && !extendedPilot.status && totalDist && extendedPilot.toGoDist) {
                extendedPilot.status = totalDist / 2 < extendedPilot.toGoDist ? 'climbing' : 'descending';
            }
        }

        if (controllers?.size) {
            extendedPilot.firs = [...controllers];
        }

        if (!extendedPilot.status) {
            extendedPilot.status = 'enroute';
        }

        // Diversion Detection
        if (extendedPilot.status === 'departed' || extendedPilot.status === 'climbing' ||
            extendedPilot.status === 'cruising' || extendedPilot.status === 'enroute' ||
            extendedPilot.status === 'descending' || extendedPilot.status === 'arriving') {
            const oldPilot = radarStorage.extendedPilotsMap[extendedPilot.cid];
            const arrival = extendedPilot.flight_plan?.arrival;
            const oldFlightPlan = oldPilot?.flight_plan;

            if (arrival && oldFlightPlan) {
                if (oldFlightPlan.diverted) {
                    extendedPilot.flight_plan ??= {};

                    if (oldFlightPlan.diverted_arrival !== arrival) {
                        if (oldFlightPlan.diverted_origin === arrival || arrival === 'ZZZZ') {
                            extendedPilot.flight_plan.diverted = false;
                        }
                        else {
                            extendedPilot.flight_plan.diverted_arrival = arrival;
                            extendedPilot.flight_plan.diverted_origin = oldFlightPlan.diverted_origin;
                            extendedPilot.flight_plan.diverted = true;
                        }
                    }
                    else {
                        extendedPilot.flight_plan = {
                            ...extendedPilot.flight_plan,
                            diverted_arrival: oldFlightPlan.diverted_arrival,
                            diverted_origin: oldFlightPlan.diverted_origin,
                            diverted: true,
                        };
                    }
                }
                else if (
                    arrival !== 'ZZZZ' && oldFlightPlan.arrival !== 'ZZZZ' &&
                    oldFlightPlan.arrival && oldFlightPlan.arrival !== arrival &&
                    radarStorage.vatspy.data?.keyAirports.realIcao[oldFlightPlan.arrival] && radarStorage.vatspy.data?.keyAirports.realIcao[arrival] &&
                    extendedPilot.flight_plan?.flight_rules !== 'V'
                ) {
                    extendedPilot.flight_plan = {
                        ...extendedPilot.flight_plan,
                        diverted: true,
                        diverted_arrival: arrival,
                        diverted_origin: oldFlightPlan.arrival,
                    };
                }
            }
        }

        origPilot.status = extendedPilot.status;
        origPilot.toGoDist = extendedPilot.toGoDist;
        origPilot.depDist = extendedPilot.depDist;
        origPilot.arrival = extendedPilot.flight_plan?.arrival;
        origPilot.diverted = extendedPilot.flight_plan?.diverted;
        origPilot.diverted_arrival = extendedPilot.flight_plan?.diverted_arrival;
        origPilot.diverted_origin = extendedPilot.flight_plan?.diverted_origin;

        updatePilots[extendedPilot.cid] = extendedPilot;
        radarStorage.vatsim.extendedPilots.push(extendedPilot);
    }

    radarStorage.extendedPilotsMap = updatePilots;
}

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
});

export async function updateAustraliaData() {
    const sectors = await $fetch('https://raw.githubusercontent.com/vatSys/australia-dataset/master/Sectors.xml', {
        responseType: 'text',
    });

    const json = xmlParser.parse(sectors);
    radarStorage.vatsim.australia = json.Sectors.Sector.map((sector: Record<string, any>) => ({
        fullName: sector.FullName,
        name: sector.Name,
        callsign: sector.Callsign,
        frequency: sector.Frequency,
    }));
}

let transceiversInProgress = false;

export async function updateTransceivers() {
    if (transceiversInProgress) return;
    try {
        transceiversInProgress = true;
        radarStorage.vatsim.transceivers = await $fetch<VatsimTransceiver[]>('https://data.vatsim.net/v3/transceivers-data.json', {
            timeout: 1000 * 30,
            headers: getVATSIMIdentHeaders(),
        });
    }
    catch (e) {
        console.error(e);
    }
    finally {
        transceiversInProgress = false;
    }
}

function mapAirlines(airlines: RadarDataAirline[]): RadarDataAirlinesList {
    return Object.fromEntries(airlines.map(val => {
        const name = val.name.split('');

        name.forEach((symbol, index) => {
            const previousSymbol = val.name[index - 1];
            if (previousSymbol !== undefined && previousSymbol !== ' ' && previousSymbol !== '(') name[index] = symbol.toLowerCase();
            else name[index] = symbol.toUpperCase();
        });

        val.name = name.join('');

        return [val.icao, val];
    }));
}

export async function updateAirlines() {
    const data = await $fetch<RadarDataAirlineAll>(!isDebug() ? 'http://data:3000/airlines/all' : 'https://data.vatsim-radar.com/airlines/all', {
        retry: 3,
    });

    const airlines = mapAirlines(data.airlines);
    const virtual = mapAirlines(data.virtual);

    radarStorage.airlines = {
        airlines,
        virtual,
        all: {
            ...virtual,
            ...airlines,
        },
    };
    await setRedisData('data-airlines', radarStorage.airlines, 1000 * 60 * 60 * 24 * 7);
}

export async function updateBookings() {
    try {
        const bookingData = await fetchBookingData();
        if (!bookingData) return;

        const { divisionCache, subDivisionCache } = await createCaches();

        const bookings = bookingData.map(booking => {
            const division = divisionCache[booking.division];
            const subdivision = subDivisionCache[booking.subdivision];
            const atc = makeFakeAtc(booking);
            const start = new Date(booking.start + 'Z').getTime();
            const end = new Date(booking.end + 'Z').getTime();

            return {
                ...booking,
                division: division,
                subdivision: subdivision,
                atc: atc,
                start: start,
                end: end,
            };
        }) as VatsimBooking[];

        /* const start = new Date();
        const end = new Date();
        start.setMinutes(start.getMinutes() + 60);
        end.setMinutes((end.getMinutes() + 60) * 3);

        bookings.push({
            atc: {
                callsign: 'ETNW_TWR',
                cid: 10000,
                facility: getFacilityByCallsign('ETNW_TWR'),
                frequency: '122.800',
                logon_time: '',
                name: 'Test dummy',
                rating: 1,
                text_atis: [],
                visual_range: 1,
            },
            start: start.getTime(),
            end: end.getTime(),
            id: 0,
            type: 'booking',
        });*/

        setRedisData('data-bookings', bookings, 1000 * 60 * 60 * 24 * 7);
    }
    catch (error) {
        console.error('Error in cron job:', error);
    }
}

async function fetchBookingData(): Promise<VatsimBookingData[] | undefined> {
    try {
        const response = await $fetch<VatsimBookingData[]>('https://atc-bookings.vatsim.net/api/booking', {
            parseResponse: responseText => JSON.parse(responseText),
            timeout: 1000 * 30,
        });
        return response;
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
}

async function createCaches(): Promise<{
    divisionCache: { [key: string]: VatsimDivision };
    subDivisionCache: { [key: string]: VatsimSubDivision };
}> {
    const divisionCache: { [key: string]: VatsimDivision } = {};
    const subDivisionCache: { [key: string]: VatsimSubDivision } = {};

    for (const division of radarStorage.vatsimStatic.divisions.values().toArray()) {
        divisionCache[division.id] = division;
    }
    for (const subdivision of radarStorage.vatsimStatic.subDivisions.values().toArray()) {
        subDivisionCache[subdivision.code] = subdivision;
    }

    return { divisionCache, subDivisionCache };
}

function makeFakeAtc(booking: VatsimBookingData): VatsimShortenedController {
    return {
        cid: booking.cid,
        name: '',
        callsign: booking.callsign,
        frequency: '',
        facility: getFacilityByCallsign(booking.callsign),
        rating: -1,
        logon_time: '',
        text_atis: [],
    };
}
