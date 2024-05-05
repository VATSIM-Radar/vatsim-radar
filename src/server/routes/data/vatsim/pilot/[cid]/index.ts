import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import { toRadians } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import { toLonLat } from 'ol/proj';
import { getNavigraphGates } from '~/utils/backend/navigraph';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { checkIsPilotInGate, getPilotTrueAltitude } from '~/utils/shared/vatsim';
import { MultiPolygon } from 'ol/geom';
import { fromServerLonLat } from '~/utils/backend/vatsim';

function calculateDistanceInNauticalMiles([lon1, lat1]: Coordinate, [lon2, lat2]: Coordinate): number {
    const earthRadiusInNauticalMiles = 3440.065;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusInNauticalMiles * c;
}

function calculateProgressPercentage(current: Coordinate, dep: Coordinate, dest: Coordinate): number {
    const totalDistance = calculateDistanceInNauticalMiles(dep, dest);
    const remainingDistance = calculateDistanceInNauticalMiles(current, dest);

    return ((totalDistance - remainingDistance) / totalDistance) * 100;
}

function calculateArrivalTime(current: Coordinate, dest: Coordinate, groundSpeed: number): Date {
    const distance = calculateDistanceInNauticalMiles(current, dest);
    const timeInHours = distance / groundSpeed;

    const currentTime = new Date();

    const timeInMillis = timeInHours * 60 * 60 * 1000;

    return new Date(currentTime.getTime() + timeInMillis);
}

export default defineEventHandler(async (event): Promise<VatsimExtendedPilot | undefined> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.data?.pilots.find(x => x.cid === +cid);
    if (!pilot) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Pilot with this cid is not found or offline',
        });
        return;
    }

    const user = await findAndRefreshFullUserByCookie(event);

    const extendedPilot: VatsimExtendedPilot = {
        ...pilot,
    };

    const groundDep = radarStorage.vatsim.airports.find(x => x.aircrafts.groundDep?.includes(pilot.cid));
    const groundArr = radarStorage.vatsim.airports.find(x => x.aircrafts.groundArr?.includes(pilot.cid));

    if (groundDep) {
        extendedPilot.airport = groundDep.icao;
        const gates = await getNavigraphGates({
            user,
            icao: groundDep.icao,
            event,
        });

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
        const gates = await getNavigraphGates({
            user,
            icao: groundArr.icao,
            event,
        });

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

        if (extendedPilot.flight_plan.route) {
            const regex = /F(?<level>[0-9]{2,3})$/;

            const stepclimbs = extendedPilot.flight_plan.route.split(' ').map((item) => {
                const regexResult = regex.exec(item);
                if (!regexResult?.groups?.level) return 0;
                return +regexResult.groups.level;
            }).filter(x => !!x && x !== extendedPilot.cruise!.planned).sort((a, b) => a - b);
            if (stepclimbs[0]) extendedPilot.cruise.min = stepclimbs[0] * 100;
            if (stepclimbs.length > 1) extendedPilot.cruise.max = stepclimbs[stepclimbs.length - 1] * 100;

            if (extendedPilot.cruise.min === extendedPilot.cruise.planned) delete extendedPilot.cruise.min;
            if (extendedPilot.cruise.max === extendedPilot.cruise.planned) delete extendedPilot.cruise.max;

            if (extendedPilot.cruise.min && extendedPilot.cruise.min > extendedPilot.cruise.planned) {
                extendedPilot.cruise.planned = extendedPilot.cruise.min;
                extendedPilot.cruise.min = +extendedPilot.flight_plan.altitude;
            }
        }

        if (!extendedPilot.isOnGround && getPilotTrueAltitude(extendedPilot) + 300 >= (extendedPilot.cruise.min || extendedPilot.cruise.planned)) {
            extendedPilot.status = 'cruising';
        }
        else if (!extendedPilot.isOnGround && !extendedPilot.status && totalDist && extendedPilot.toGoDist) {
            extendedPilot.status = totalDist / 2 < extendedPilot.toGoDist ? 'climbing' : 'descending';
        }
    }

    const list = radarStorage.vatspy.data?.firs ?? [];

    const firs = list.map((fir) => {
        const geometry = new MultiPolygon(fir.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromServerLonLat(x)))));
        return geometry.intersectsCoordinate([pilot.longitude, pilot.latitude]) &&
            radarStorage.vatsim.firs.filter(
                x => x.firs.some(x => x.icao === fir.icao && x.boundaryId === fir.feature.id) && x.controller,
            )!;
    }).filter(x => !!x);

    if (firs.length) {
        extendedPilot.firs = [...new Set(
            //@ts-expect-error
            firs.flatMap(x => x && x.map(x => x.controller?.callsign)).filter(x => !!x) as string[],
        )];
    }

    if (!extendedPilot.status) {
        extendedPilot.status = 'enroute';
    }

    return extendedPilot;
});
