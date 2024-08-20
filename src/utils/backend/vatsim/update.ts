import { fromServerLonLat, getTransceiverData } from '~/utils/backend/vatsim/index';
import { useFacilitiesIds } from '~/utils/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimExtendedPilot, VatsimMandatoryData } from '~/types/data/vatsim';
import { getAircraftIcon } from '~/utils/icons';
import { getNavigraphGates } from '~/utils/backend/navigraph';
import { checkIsPilotInGate, getPilotTrueAltitude } from '~/utils/shared/vatsim';
import { toLonLat } from 'ol/proj';
import {
    calculateArrivalTime,
    calculateDistanceInNauticalMiles,
    calculateProgressPercentage,
} from '~/utils/shared/flight';
import type { NavigraphGate } from '~/types/data/navigraph';
import { getFirsPolygons } from '~/utils/backend/vatsim/vatspy';
import { $fetch } from 'ofetch';
import { getCFWorkerDomain } from '~/utils/backend/worker/utils';

export async function updateVatsimDataStorage() {
    const data = radarStorage.vatsim.data!;

    data.pilots = data.pilots.map(x => {
        const coords = fromServerLonLat([x.longitude, x.latitude]);
        const transceiver = getTransceiverData(x.callsign);

        return {
            ...x,
            longitude: coords[0],
            latitude: coords[1],
            frequencies: transceiver.frequencies,
        };
    }).filter((x, index) => !data.pilots.some((y, yIndex) => y.cid === x.cid && yIndex < index));

    data.general.supsCount = data.controllers.filter(x => x.rating === 11 && x.frequency === '199.998').length;
    data.general.admCount = data.controllers.filter(x => x.rating === 12 && x.frequency === '199.998').length;
    data.general.onlineWSUsers = (await $fetch<{ clients: number }>(`${ getCFWorkerDomain() }/online`).catch(console.error))?.clients || -1;

    data.prefiles = data.prefiles.filter((x, index) => !data.pilots.some(y => x.cid === y.cid) && !data.prefiles.some((y, yIndex) => y.cid === x.cid && yIndex > index));

    const positions = useFacilitiesIds();

    data.controllers = data.controllers.filter(controller => {
        if (controller.facility === positions.OBS) return;
        let postfix = controller.callsign.split('_').slice(-1)[0];
        if (postfix === 'DEP') postfix = 'APP';
        controller.facility = positions[postfix as keyof typeof positions] ?? -1;
        return controller.facility !== -1 && controller.facility !== positions.OBS;
    });
}

export function updateVatsimMandatoryDataStorage() {
    const data = radarStorage.vatsim.data!;

    const newData: VatsimMandatoryData = {
        pilots: [],
        controllers: [],
        atis: [],
    };

    for (const pilot of data.pilots) {
        const coords = toLonLat([pilot.longitude, pilot.latitude]);
        newData.pilots.push([pilot.cid, coords[0], coords[1], getAircraftIcon(pilot).icon, pilot.heading]);
    }

    // Maybe no need to implement
    // newData.controllers = data.controllers.map(x => [x.cid, x.callsign, x.frequency, x.facility]);
    // newData.atis = data.atis.map(x => [x.cid, x.callsign, x.frequency, x.facility]);

    radarStorage.vatsim.mandatoryData = newData;
}

const gates: Record<string, NavigraphGate[]> = {};

async function getCachedGates(icao: string): Promise<NavigraphGate[]> {
    const existing = gates[icao];
    if (existing) return existing;

    gates[icao] = await getNavigraphGates({
        user: null,
        icao: icao,
    }).catch(console.error) || [];

    return gates[icao];
}

export async function updateVatsimExtendedPilots() {
    const firsPolygons = getFirsPolygons();

    const firsList = firsPolygons.map(({ icao, featureId, polygon }) => ({
        controllers: radarStorage.vatsim.firs.filter(
            x => x.controller && x.firs.some(x => x.icao === icao && x.boundaryId === featureId),
        ),
        polygon,
    })).filter(x => x.controllers.length);

    radarStorage.vatsim.extendedPilots = [];

    for (const pilot of radarStorage.vatsim.data!.pilots) {
        const extendedPilot: VatsimExtendedPilot = {
            ...pilot,
        };

        const groundDep = radarStorage.vatsim.airports.find(x => x.aircraft.groundDep?.includes(pilot.cid));
        const groundArr = radarStorage.vatsim.airports.find(x => x.aircraft.groundArr?.includes(pilot.cid));

        if (groundDep) {
            extendedPilot.airport = groundDep.icao;
            const gates = await getCachedGates(groundDep.icao);

            const check = gates && checkIsPilotInGate(pilot, gates);
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

            const check = checkIsPilotInGate(pilot, gates);
            if ((check?.truly || check?.maybe) && extendedPilot.groundspeed === 0) {
                extendedPilot.status = 'arrGate';
            }
            else {
                extendedPilot.status = 'arrTaxi';
            }

            extendedPilot.isOnGround = true;
        }

        let totalDist: number | null = null;

        const dep = radarStorage.vatspy.data?.airports.find(x => x.icao === pilot.flight_plan?.departure);
        const arr = radarStorage.vatspy.data?.airports.find(x => x.icao === pilot.flight_plan?.arrival);

        if (dep && arr) {
            const pilotCoords = toLonLat([pilot.longitude, pilot.latitude]);
            const depCoords = toLonLat([dep.lon, dep.lat]);
            const arrCoords = toLonLat([arr.lon, arr.lat]);

            totalDist = calculateDistanceInNauticalMiles(depCoords, arrCoords);
            extendedPilot.depDist = calculateDistanceInNauticalMiles(depCoords, pilotCoords);
            if (extendedPilot.status !== 'arrGate' && extendedPilot.status !== 'arrTaxi') {
                extendedPilot.toGoDist = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
                extendedPilot.toGoPercent = calculateProgressPercentage(pilotCoords, depCoords, arrCoords);
                if (extendedPilot.toGoPercent < 0) extendedPilot.toGoPercent = 0;
                extendedPilot.toGoTime = calculateArrivalTime(pilotCoords, arrCoords, pilot.groundspeed).getTime();

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
            extendedPilot.cruise = {
                planned: +extendedPilot.flight_plan.altitude,
            };

            if (extendedPilot.cruise.planned < 1000) extendedPilot.cruise.planned *= 100;

            if (extendedPilot.flight_plan.route) {
                const regex = /F(?<level>[0-9]{2,3})$/;

                const stepclimbs = extendedPilot.flight_plan.route.split(' ').map(item => {
                    const regexResult = regex.exec(item);
                    if (!regexResult?.groups?.level) return 0;
                    return +regexResult.groups.level;
                }).filter(x => !!x && x !== extendedPilot.cruise!.planned).sort((a, b) => a - b);
                if (stepclimbs[0]) extendedPilot.cruise.min = stepclimbs[0] * 100;
                if (stepclimbs.length > 1) extendedPilot.cruise.max = stepclimbs[stepclimbs.length - 1] * 100;

                if (extendedPilot.cruise.min === extendedPilot.cruise.planned) delete extendedPilot.cruise.min;
                if (extendedPilot.cruise.max === extendedPilot.cruise.planned) delete extendedPilot.cruise.max;

                if (extendedPilot.cruise.min && extendedPilot.cruise.min > extendedPilot.cruise.planned) {
                    const planned = extendedPilot.cruise.min;
                    extendedPilot.cruise.planned = extendedPilot.cruise.min;
                    extendedPilot.cruise.min = planned;
                }
            }

            if (!extendedPilot.isOnGround && getPilotTrueAltitude(extendedPilot) + 300 >= (extendedPilot.cruise.min || extendedPilot.cruise.planned)) {
                extendedPilot.status = 'cruising';
            }
            else if (!extendedPilot.isOnGround && !extendedPilot.status && totalDist && extendedPilot.toGoDist) {
                extendedPilot.status = totalDist / 2 < extendedPilot.toGoDist ? 'climbing' : 'descending';
            }
        }

        const firs = firsList.filter(fir => {
            return fir.polygon.intersectsCoordinate([pilot.longitude, pilot.latitude]);
        });

        if (firs.length) {
            extendedPilot.firs = [...new Set(
                firs
                    .flatMap(x => x && x.controllers.map(x => x.controller?.callsign))
                    .filter(x => !!x) as string[],
            )];
        }

        if (!extendedPilot.status) {
            extendedPilot.status = 'enroute';
        }

        radarStorage.vatsim.extendedPilots.push(extendedPilot);
    }
}
