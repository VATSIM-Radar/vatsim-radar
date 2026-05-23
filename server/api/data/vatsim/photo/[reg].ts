import { handleH3Error } from '~/utils/server/h3';
import type { PlaneSpottersPhoto } from '~/types/data/vatsim';

export default defineEventHandler(async event => {
    const reg = getRouterParam(event, 'reg');
    if (!reg) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid reg',
        });
        return;
    }

    const photo = await $fetch<{ photos: PlaneSpottersPhoto[] }>(`https://api.planespotters.net/pub/photos/reg/${ reg }`, {
        headers: {
            'User-Agent': 'VatsimRadar/2.0 (dan@vatsim-radar.com)',
        },
    }).catch(() => null);

    return photo?.photos?.[0] ?? {
        status: '404',
    };
});
