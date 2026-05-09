import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import type { PlaneSpottersPhoto } from '~/types/data/vatsim';
import { getFlightPlanParam } from '~/utils/shared/vatsim';

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

    const reg = getFlightPlanParam(pilot.flight_plan?.remarks, 'REG');

    if (!reg) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Registration not found',
        });
        return;
    }

    const photo = await $fetch<{ photos: PlaneSpottersPhoto[] }>(`https://api.planespotters.net/pub/photos/reg/${ reg }`).catch(() => null);

    return photo?.photos?.[0] ?? {
        status: '404',
    };
});
