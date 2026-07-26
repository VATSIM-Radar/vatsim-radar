import { handleH3Error } from '~/utils/server/h3';

import type { QuestDBGeojson } from '~/utils/server/questdb/converters';
import { radarStorage } from '~/utils/server/storage';
import { getQuestDBOnlineFlightTurnsGeojson } from '~/utils/server/questdb/converters';
import { isQuestDBConfigured } from '~/utils/server/questdb/client';

export default defineEventHandler(async (event): Promise<QuestDBGeojson | null | undefined> => {
    if (!isQuestDBConfigured()) return;

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
            const geojson = await getQuestDBOnlineFlightTurnsGeojson(cid, typeof start === 'string' ? start : undefined, getQuery(event).full === '1');

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
            if ((e as any).code !== 'UNAVAILABLE') {
                console.error('Failed to load QuestDB turns', e);
            }

            return {
                flightPlan: pilot.flight_plan?.route,
            };
        }
    }
    catch (e) {
        if ((e as any).message?.includes('REFUSED')) {
            return;
        }

        console.error(e);
    }
});
