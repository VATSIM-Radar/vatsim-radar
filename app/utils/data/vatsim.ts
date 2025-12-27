import type { VatsimShortenedAircraft, VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyData, VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import { radarStorage } from '~/utils/backend/storage';
import type { MapAircraftKeys, MapAirport } from '~/types/map';
import type { Coordinate } from 'ol/coordinate';
import { findAirportSomewhere } from '~/utils/backend/vatsim';

export const useFacilitiesIds = () => {
    return {
        OBS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'OBS')?.id ?? -1,
        FSS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'FSS')?.id ?? -1,
        DEL: radarStorage.vatsim.data?.facilities.find(x => x.short === 'DEL')?.id ?? -1,
        GND: radarStorage.vatsim.data?.facilities.find(x => x.short === 'GND')?.id ?? -1,
        TWR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'TWR')?.id ?? -1,
        APP: radarStorage.vatsim.data?.facilities.find(x => x.short === 'APP')?.id ?? -1,
        CTR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'CTR')?.id ?? -1,
    };
};

const facilitiesMap: { [key: string]: number } = {
    OBS: 0,
    FSS: 1,
    DEL: 2,
    GND: 3,
    TWR: 4,
    APP: 5,
    CTR: 6,
};

export function getFacilityByCallsign(callsign: string): number {
    for (const suffix in facilitiesMap) {
        if (callsign.endsWith(suffix)) {
            return facilitiesMap[suffix];
        }
    }
    return -1;
}

function findFacility(name: string, controller: VatsimShortenedController) {
    return radarStorage.vatspy.data!.firs.filter(x => {
        if (x.icao !== name && x.callsign !== name) return false;

        const duplicateFir = radarStorage.vatspy.data!.firs.find(y => x.icao === y.icao && x.isOceanic === !y.isOceanic);
        if (!duplicateFir) return true;

        return controller.facility === useFacilitiesIds().FSS ? x.isOceanic : !x.isOceanic;
    });
}

function findUir(name: string, controller: VatsimShortenedController): VatSpyDataFeature | undefined {
    const uir = radarStorage.vatspy.data!.uirs.find(x => x.icao === name);

    if (!uir) return;

    const firs = uir.firs.split(',');
    const uirFeatures = radarStorage.vatspy.data!.firs.filter(x => {
        if (!firs.includes(x.callsign ?? '') && !firs.includes(x.icao ?? '')) return false;

        const duplicateFir = radarStorage.vatspy.data!.firs.find(y => x.icao === y.icao && x.isOceanic === !y.isOceanic);
        if (!duplicateFir) return true;

        return controller.facility === useFacilitiesIds().FSS ? x.isOceanic : !x.isOceanic;
    });
    if (!uirFeatures?.length) return;

    return {
        ...uir,
        controller,
        firs: uirFeatures.map(x => ({
            icao: x.icao,
            callsign: x.callsign,
            boundaryId: x.feature.id as string,
        })),
    };
}

function filterATCByType(types: number[]) {
    return [...radarStorage.vatsim.regularData?.controllers ?? [], ...radarStorage.vatsimStatic.bookings.map(x => x.atc)].filter(x => {
        if (!types.includes(x.facility)) return false;
        const freq = parseFloat(x.frequency || '0');
        return freq < 137 && freq > 117;
    });
}

export const getLocalATC = (): VatSpyDataLocalATC[] => {
    const facilities = useFacilitiesIds();
    const locals = [
        ...filterATCByType([facilities.DEL, facilities.GND, facilities.TWR, facilities.APP]),
        ...radarStorage.vatsim.regularData!.atis,
    ];

    const vatspy = (radarStorage.vatspy).data!;
    const simaware = (radarStorage.simaware).data!;

    return locals.map(atc => {
        const airport = findAirportSomewhere({
            callsign: atc.callsign,
            isApp: atc.facility === facilities.APP,
            vatspy,
            simaware,
        });

        if (!airport) {
            return {
                atc: {
                    ...atc,
                    isATIS: atc.callsign.endsWith('ATIS'),
                },
                isATIS: atc.callsign.endsWith('ATIS'),
            };
        }

        const isSimAware = 'isSimAware' in airport ? !!airport.isSimAware : (!('icao' in airport) || !!airport.isSimAware);

        if (isSimAware && atc.facility !== facilities.APP) {
            atc.isTWR = atc.facility === facilities.TWR;
            atc.facility = facilities.APP;
        }

        return {
            atc: {
                ...atc,
                isATIS: atc.callsign.endsWith('ATIS'),
            },
            airport: {
                icao: 'icao' in airport ? airport.icao : airport.properties!.id,
                iata: 'icao' in airport ? airport.iata : undefined,
                isPseudo: !('icao' in airport),
                isSimAware,
            },
            isATIS: atc.callsign.endsWith('ATIS'),
        };
    }).filter(x => x);
};

function findUirOrFir(splittedName: string[], atc: VatsimShortenedController, uir: true): VatSpyDataFeature | null;
function findUirOrFir(splittedName: string[], atc: VatsimShortenedController, uir: false): VatSpyData['firs'];
function findUirOrFir(splittedName: string[], atc: VatsimShortenedController, uir: boolean) {
    const regularName = splittedName.join('_');
    const firstName = splittedName[0];
    const secondName = splittedName.length === 2 && splittedName[1];

    if (uir) {
        let uir = findUir(regularName, atc);
        if (!uir && secondName && secondName.length > 1) {
            for (let i = 0; i < secondName.length; i++) {
                uir = findUir(regularName.substring(0, regularName.length - 1 - i), atc);
                if (uir) break;
            }
        }
        if (!uir) uir = findUir(firstName, atc);
        if (uir) return uir;
        return null;
    }
    else {
        let feature = findFacility(regularName, atc);
        if (!feature.length && secondName && secondName.length > 1) {
            for (let i = 0; i < secondName.length - 1; i++) {
                feature = findFacility(regularName.substring(0, regularName.length - 1 - i), atc);
                if (feature.length) break;
            }
        }
        if (!feature.length) feature = findFacility(firstName, atc);
        return feature;
    }
}

export const getATCBounds = (): VatSpyDataFeature[] => {
    const facilities = useFacilitiesIds();
    const atcWithBounds = filterATCByType([facilities.CTR, facilities.FSS]).filter(x => !x.isBooking);

    return atcWithBounds.flatMap(atc => {
        let splittedName = atc.callsign.toUpperCase().replaceAll('__', '_').split('_');
        splittedName = splittedName.slice(0, splittedName.length - 1);

        if (atc.facility === facilities.FSS) {
            const uir = findUirOrFir(splittedName, atc, true);

            if (uir) return uir;
        }

        const feature = findUirOrFir(splittedName, atc, false);

        if (!feature.length) {
            const uir = findUirOrFir(splittedName, atc, true);
            if (uir) return uir;
        }

        return {
            controller: atc,
            firs: feature.map(x => ({
                icao: x.icao,
                callsign: x.callsign,
                boundaryId: x.feature.id as string,
            })),
        };
    });
};

const groundZone = 0.09;

function isAircraftOnGround(zone: Coordinate, aircraft: VatsimShortenedAircraft): boolean {
    return aircraft.longitude < zone[0] + groundZone && aircraft.longitude > zone[0] - groundZone && aircraft.latitude < zone[1] + groundZone && aircraft.latitude > zone[1] - groundZone;
}

export async function getAirportsList() {
    const vatspy = (radarStorage.vatspy)!;
    const airports: MapAirport[] = [];
    const dataAirports = vatspy.data!.airports.filter(x => !x.isPseudo);
    const pilots = radarStorage.vatsim.data!.pilots;

    function addPilotToList(status: MapAircraftKeys, airport: VatSpyData['airports'][0], pilot: number) {
        let existingAirport = airports.find(x => x.icao === airport.icao);
        if (!existingAirport) {
            existingAirport = {
                icao: airport.icao,
                iata: airport.iata,
                isPseudo: airport.isPseudo,
                isSimAware: false,
                aircraft: {
                    [status]: [pilot],
                },
            };
            airports.push(existingAirport);
            return;
        }

        const existingArr = existingAirport.aircraft[status];

        if (!existingArr) {
            existingAirport.aircraft[status] = [pilot];
        }
        else {
            existingArr.push(pilot);
        }
    }

    const groundPilots: Record<number, VatSpyData['airports']> = {};

    const filteredPilots = pilots.filter(x => x.groundspeed < 50);

    for (const airport of dataAirports) {
        const zone = [airport.lon, airport.lat];
        for (const pilot of filteredPilots) {
            if (isAircraftOnGround(zone, pilot)) {
                groundPilots[pilot.cid] ??= [];
                groundPilots[pilot.cid].push(airport);
            }
        }
    }

    for (const pilot of pilots) {
        const statuses: Array<{ status: MapAircraftKeys; airport: VatSpyData['airports'][0] }> = [];
        const groundAirports = groundPilots[pilot.cid] ?? null;

        let groundAirport = (groundAirports && groundAirports?.length > 1)
            ? groundAirports.sort((a, b) => {
                const aDistance = Math.sqrt(Math.pow(pilot.latitude - a.lat, 2) + Math.pow(pilot.longitude - a.lon, 2));
                const bDistance = Math.sqrt(Math.pow(pilot.latitude - b.lat, 2) + Math.pow(pilot.longitude - b.lon, 2));

                return aDistance - bDistance;
            })[0]
            : groundAirports?.[0] ?? null;

        if (groundAirports && groundAirports?.length > 1 && (pilot.flight_plan?.departure || pilot.flight_plan?.arrival)) {
            const airport = groundAirports.find(x => (
                x.icao === pilot.flight_plan?.arrival ||
                x.iata === pilot.flight_plan?.arrival ||
                x.icao === pilot.flight_plan?.departure ||
                x.iata === pilot.flight_plan?.departure
            ));
            if (airport) groundAirport = airport;
        }

        if (!pilot.flight_plan?.departure) {
            // We don't know where the pilot is :(
            if (!groundAirport) continue;

            statuses.push({
                status: 'groundDep',
                airport: groundAirport,
            });
        }
        else {
            let departureAirport = (groundAirport?.icao === pilot.flight_plan.departure || groundAirport?.iata === pilot.flight_plan.departure)
                ? groundAirport
                : vatspy.data!.keyAirports.realIata[pilot.flight_plan!.departure] || vatspy.data!.keyAirports.realIcao[pilot.flight_plan!.departure];

            if (departureAirport) {
                if (departureAirport.icao !== departureAirport.iata && departureAirport.iata === pilot.flight_plan.departure) {
                    departureAirport = {
                        ...departureAirport,
                        icao: departureAirport.iata,
                    };
                }

                statuses.push({
                    status: (groundAirport?.icao === departureAirport.icao || (groundAirport?.iata && groundAirport?.iata === departureAirport.iata)) ? 'groundDep' : 'departures',
                    airport: departureAirport,
                });
            }

            if (pilot.flight_plan.arrival || groundAirport) {
                if (pilot.flight_plan.arrival === pilot.flight_plan.departure) {
                    if (!groundAirport && statuses[0]) {
                        statuses[1] = {
                            airport: statuses[0].airport,
                            status: 'arrivals',
                        };
                    }
                    else if (groundAirport && statuses[0]?.status !== 'groundDep') {
                        statuses.push({
                            airport: groundAirport,
                            status: 'groundArr',
                        });
                    }
                }
                else {
                    let arrivalAirport = (groundAirport?.icao === pilot.flight_plan.arrival || (pilot.flight_plan.arrival && groundAirport?.iata === pilot.flight_plan.arrival))
                        ? groundAirport
                        : vatspy.data!.keyAirports.realIata[pilot.flight_plan!.arrival!] || vatspy.data!.keyAirports.realIcao[pilot.flight_plan!.arrival!];

                    if (arrivalAirport) {
                        if (pilot.flight_plan.arrival && arrivalAirport.icao !== arrivalAirport.iata && arrivalAirport.iata === pilot.flight_plan.arrival) {
                            arrivalAirport = {
                                ...arrivalAirport,
                                icao: arrivalAirport.iata,
                            };
                        }

                        const isDifferentAirport = !!groundAirport &&
                            groundAirport.icao !== departureAirport?.icao && (!groundAirport.iata || groundAirport.iata !== departureAirport?.iata) &&
                            groundAirport.icao !== arrivalAirport?.icao && (!groundAirport.iata || groundAirport.iata !== arrivalAirport?.iata);

                        statuses.push({
                            status: (isDifferentAirport || groundAirport?.icao === arrivalAirport.icao || (groundAirport?.iata && groundAirport?.iata === arrivalAirport.iata)) ? 'groundArr' : 'arrivals',
                            airport: isDifferentAirport ? groundAirport! : arrivalAirport,
                        });
                    }
                }
            }
        }

        statuses.forEach(status => {
            addPilotToList(status.status, status.airport, pilot.cid);
        });
    }

    radarStorage.vatsim.regularData!.prefiles.filter(x => x.departure).forEach(prefile => {
        if (prefile.departure) {
            const airport = vatspy.data!.keyAirports.realIata[prefile.departure] || vatspy.data!.keyAirports.realIcao[prefile.departure];
            if (airport) addPilotToList('prefiles', airport, prefile.cid);
        }
    });

    radarStorage.vatsim.locals.forEach(atc => {
        const airport = atc.airport;
        if (!airport) return;

        const duplicateAirport = airports.find(x => x.icao === airport.icao && x.iata !== airport.iata);

        if (duplicateAirport) {
            atc.airport = {
                ...duplicateAirport,
                tracon: airport.iata,
            };
            return;
        }

        if (!airports.some(x => airport.iata ? x.iata === airport.iata : x.icao === airport.icao)) {
            const airportExist = airport.iata ? vatspy.data!.keyAirports.realIata[airport.iata ?? ''] : vatspy.data!.keyAirports.realIcao[airport.icao];
            const someAirportExist = vatspy.data!.keyAirports.iata[airport.iata ?? ''] || vatspy.data!.keyAirports.icao[airport.icao];

            airports.push({
                icao: airport.icao,
                iata: airportExist ? airport.iata : someAirportExist?.iata,
                isPseudo: !airportExist,
                isSimAware: !someAirportExist,
                aircraft: {},
            });
        }
    });

    return airports;
}
