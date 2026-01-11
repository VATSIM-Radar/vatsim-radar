import { handleH3Error } from '~/utils/server/h3';

import type { InfluxGeojson } from '~/utils/server/influx/converters';
import { radarStorage } from '~/utils/server/storage';
import { getInfluxOnlineFlightTurnsGeojson } from '~/utils/server/influx/converters';

export default cachedEventHandler(async (event): Promise<InfluxGeojson | null | undefined> => {
    if (!process.env.INFLUX_URL) return;

    try {
        const cid = getRouterParam(event, 'cid');
        if (!cid) {
            handleH3Error({
                event,
                statusCode: 400,
                data: 'Invalid CID',
            });
            return;
        }

        const pilot = radarStorage.vatsim.data?.pilots.find(x => x.cid === +cid);
        if (!pilot) {
            handleH3Error({
                event,
                statusCode: 404,
                data: 'Pilot with this cid was not found',
            });
            return;
        }

        const start = getQuery(event).start;

        try {
            const geojson = await getInfluxOnlineFlightTurnsGeojson(cid, typeof start === 'string' ? start : undefined);

            if (geojson) {
                return Object.assign(geojson, {
                    flightPlan: pilot.flight_plan?.route,
                });
            }
            else if (pilot.flight_plan?.route) {
                return {
                    flightPlan: pilot.flight_plan?.route,
                };
            }

            handleH3Error({
                event,
                statusCode: 404,
                data: `This pilot is not online or doesn't have flight plan`,
            });
        }
        catch (e) {
            return {
                flightPlan: pilot.flight_plan?.route,
            };

            throw e;
        }
    }
    catch (e) {
        if ((e as any).message?.includes('REFUSED')) {
            return;
        }

        console.error(e);
    }
}, {
    maxAge: 15,
    staleMaxAge: 30,
});
