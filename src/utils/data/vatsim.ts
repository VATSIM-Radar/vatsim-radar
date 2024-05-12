import type { VatsimShortenedAircraft, VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyData, VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import { radarStorage } from '~/utils/backend/storage';
import type { MapAirport } from '~/types/map';
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

function findFacility(name: string, controller: VatsimShortenedController) {
    return radarStorage.vatspy.data!.firs.filter((x) => {
        if (x.icao !== name && x.callsign !== name) return false;

        const duplicateFir = radarStorage.vatspy.data!.firs.find(y => x.feature.id === y.feature.id && x.isOceanic === !y.isOceanic);
        if (!duplicateFir || x.name.includes('Oceanic')) return true;

        return !x.isOceanic;
    });
}

function findUir(name: string, controller: VatsimShortenedController): VatSpyDataFeature | undefined {
    const uir = radarStorage.vatspy.data!.uirs.find(x => x.icao === name);

    if (!uir) return;

    const firs = uir.firs.split(',');
    const uirFeatures = radarStorage.vatspy.data!.firs.filter((x) => {
        if (!firs.includes(x.callsign ?? '') && !firs.includes(x.icao ?? '')) return false;

        const duplicateFir = radarStorage.vatspy.data!.firs.find(y => x.feature.id === y.feature.id && x.isOceanic === !y.isOceanic);
        if (!duplicateFir) return true;

        return x.name.includes('Oceanic') ? x.isOceanic : !x.isOceanic;
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
    return radarStorage.vatsim.regularData?.controllers.filter((x) => {
        if (!types.includes(x.facility)) return false;
        const freq = parseFloat(x.frequency || '0');
        return freq < 137 && freq > 117;
    }) ?? [];
}

export const getLocalATC = (): VatSpyDataLocalATC[] => {
    const facilities = useFacilitiesIds();
    const locals = [
        ...filterATCByType([facilities.DEL, facilities.GND, facilities.TWR, facilities.APP]),
        ...radarStorage.vatsim.regularData!.atis,
    ];

    return locals.map((atc) => {
        const callsignAirport = atc.callsign.split('_')[0];
        const airport = findAirportSomewhere(callsignAirport);

        if (!airport) return null as unknown as VatSpyDataLocalATC;
        return {
            atc: {
                ...atc,
                isATIS: atc.callsign.endsWith('ATIS'),
            },
            airport: {
                icao: 'icao' in airport ? airport.icao : airport.properties!.id,
                iata: 'icao' in airport ? airport.iata : airport.properties!.id,
                isPseudo: !('icao' in airport),
                isSimAware: !('icao' in airport),
            },
            isATIS: atc.callsign.endsWith('ATIS'),
        };
    }).filter(x => x);
};

export const getATCBounds = (): VatSpyDataFeature[] => {
    const facilities = useFacilitiesIds();
    const atcWithBounds = filterATCByType([facilities.CTR, facilities.FSS]);

    return atcWithBounds.flatMap((atc) => {
        let splittedName = atc.callsign.toUpperCase().replaceAll('__', '_').split('_');
        splittedName = splittedName.slice(0, splittedName.length - 1);

        const regularName = splittedName.join('_');
        const firstName = splittedName.slice(0, 1).join('_');

        if (atc.facility === facilities.FSS) {
            let uir = findUir(regularName, atc);
            if (!uir) uir = findUir(firstName, atc);
            if (uir) return uir;
        }

        let feature = findFacility(regularName, atc);
        if (!feature.length) feature = findFacility(firstName, atc);

        if (!feature.length) {
            let uir = findUir(regularName, atc);
            if (!uir) uir = findUir(firstName, atc);
            if (uir) {
                return uir;
            }
            else {
                return [];
            }
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

const groundZone = 10000;

function isAircraftOnGround(zone: Coordinate, aircraft: VatsimShortenedAircraft): boolean {
    return aircraft.longitude < zone[0] + groundZone && aircraft.longitude > zone[0] - groundZone && aircraft.latitude < zone[1] + groundZone && aircraft.latitude > zone[1] - groundZone;
}

export function getAirportsList() {
    const airports: MapAirport[] = [];
    const dataAirports = radarStorage.vatspy.data!.airports.filter(x => !x.isPseudo);
    const pilots = radarStorage.vatsim.data!.pilots;

    function addPilotToList(status: keyof MapAirport['aircrafts'], airport: VatSpyData['airports'][0], pilot: number) {
        let existingAirport = airports.find(x => x.icao === airport.icao);
        if (!existingAirport) {
            existingAirport = {
                icao: airport.icao,
                iata: airport.iata,
                isPseudo: airport.isPseudo,
                isSimAware: false,
                aircrafts: {
                    [status]: [pilot],
                },
            };
            airports.push(existingAirport);
            return;
        }

        const existingArr = existingAirport.aircrafts[status];

        if (!existingArr) {
            existingAirport.aircrafts[status] = [pilot];
        }
        else {
            existingArr.push(pilot);
        }
    }

    for (const pilot of pilots) {
        const statuses: Array<{ status: keyof MapAirport['aircrafts'], airport: VatSpyData['airports'][0] }> = [];
        const groundAirports = pilot.groundspeed < 50 ? dataAirports.filter(x => isAircraftOnGround([x.lon, x.lat], pilot)) : null;

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
            //We don't know where the pilot is :(
            if (!groundAirport) continue;

            statuses.push({
                status: 'groundDep',
                airport: groundAirport,
            });
        }
        else {
            let departureAirport = (groundAirport?.icao === pilot.flight_plan.departure || groundAirport?.iata === pilot.flight_plan.departure)
                ? groundAirport
                : dataAirports.find(x => x.iata === pilot.flight_plan!.departure || x.icao === pilot.flight_plan!.departure);

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
                    if(!groundAirport && statuses[0]) {
                        statuses[1] = {
                            airport: statuses[0].airport,
                            status: 'arrivals',
                        };
                    }
                    else if(groundAirport && statuses[0]?.status !== 'groundDep') {
                        statuses.push({
                            airport: groundAirport,
                            status: 'groundArr',
                        });
                    }
                }
                else {
                    let arrivalAirport = (groundAirport?.icao === pilot.flight_plan.arrival || (pilot.flight_plan.arrival && groundAirport?.iata === pilot.flight_plan.arrival))
                        ? groundAirport
                        : dataAirports.find(x => (x.iata && x.iata === pilot.flight_plan!.arrival) || x.icao === pilot.flight_plan!.arrival);

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

        statuses.forEach((status) => {
            addPilotToList(status.status, status.airport, pilot.cid);
        });
    }

    radarStorage.vatsim.regularData!.prefiles.filter(x => x.departure).forEach((prefile) => {
        if (prefile.departure) {
            const airport = dataAirports.find(x => x.icao === prefile.departure);
            if (airport) addPilotToList('prefiles', airport, prefile.cid);
        }
    });

    radarStorage.vatsim.locals.forEach((atc) => {
        const airport = atc.airport;
        if (!airports.some(x => atc.airport.iata ? x.iata === airport.iata : x.icao === airport.icao)) {
            airports.push({
                icao: airport.icao,
                iata: airport.iata,
                isPseudo: airport.isPseudo,
                isSimAware: airport.isSimAware,
                aircrafts: {},
            });
        }
    });

    return airports;
}
