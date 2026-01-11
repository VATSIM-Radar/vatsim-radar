import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';

export default defineEventHandler(async event => {
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

    return {
        flightPlan: pilot.flight_plan?.route,
    };
});
