import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

function outputInfluxValue(value: string | number | boolean) {
    if (typeof value === 'string') return `"${ value.replaceAll('"', '\\"') }"`;
    if (typeof value === 'number') {
        if (!value.toString().includes('.')) return `${ value }i`;
        return value;
    }
    if (typeof value === 'boolean') return String(value);
}

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    const date = `${ Date.now() }000000`;

    return radarStorage.vatsim.data!.pilots.filter(x => x.cid && x.callsign && x.altitude).map(pilot => {
        const obj = {
            altitude: pilot.altitude,
            callsign: pilot.callsign,
            groundspeed: pilot.groundspeed,
            heading: pilot.heading,
            latitude: pilot.latitude,
            longtitude: pilot.longitude,
            name: pilot.name,
            qnh_mb: pilot.qnh_mb,
            transponder: pilot.transponder,
            fpl_route: pilot.flight_plan?.route,
            fpl_enroute_time: pilot.flight_plan?.enroute_time,
            fpl_flight_rules: pilot.flight_plan?.flight_rules,
            fpl_departure: pilot.flight_plan?.departure,
            fpl_arrival: pilot.flight_plan?.arrival,
            fpl_altitude: pilot.flight_plan?.altitude,
        };

        return `data,cid=${ pilot.cid } ${ Object.entries(obj)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${ key }=${ outputInfluxValue(value!) }`)
            .join(',')
        } ${ date }`;
    }).join('\n');
});
