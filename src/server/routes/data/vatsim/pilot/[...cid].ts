import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import { toRadians } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import { toLonLat } from 'ol/proj';

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

export default defineEventHandler(async (event): Promise<VatsimExtendedPilot | void> => {
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

    const extendedPilot: VatsimExtendedPilot = {
        ...pilot,
        status: 'descending',
    };

    if (pilot.flight_plan?.departure && pilot.flight_plan.arrival) {
        const dep = radarStorage.vatspy.data?.airports.find(x => x.icao === pilot.flight_plan?.departure);
        const arr = radarStorage.vatspy.data?.airports.find(x => x.icao === pilot.flight_plan?.arrival);

        if (dep && arr) {
            const pilotCoords = toLonLat([pilot.longitude, pilot.latitude]);
            const depCoords = toLonLat([dep.lon, dep.lat]);
            const arrCoords = toLonLat([arr.lon, arr.lat]);

            extendedPilot.toGoDist = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
            extendedPilot.toGoPercent = calculateProgressPercentage(pilotCoords, depCoords, arrCoords);
            extendedPilot.toGoTime = calculateArrivalTime(pilotCoords, arrCoords, pilot.groundspeed).getTime();
        }
    }

    return extendedPilot;
});
