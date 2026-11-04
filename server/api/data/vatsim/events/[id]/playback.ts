import { handleH3Error, handleH3Exception } from '~/utils/server/h3.ts';
import type { VatsimEvent } from '~/types/data/vatsim.ts';
import { getVATSIMIdentHeaders } from '~/utils/server';
import { getRedisSync } from '~/utils/server/redis.ts';
import { getEventPlayback } from '~/utils/server/statsim.ts';

export default defineEventHandler(async event => {
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
        handleH3Error({
            event,
            statusCode: 400,
        });

        return;
    }

    try {
        const cached = await getRedisSync(`playback-${ id }`);
        if (cached) return JSON.parse(cached);

        const fetchedEvent = (await $fetch<{ data: VatsimEvent }>(`https://my.vatsim.net/api/v2/events/view/${ id }`, {
            headers: getVATSIMIdentHeaders(),
        })).data;

        if (new Date(fetchedEvent.end_time).getTime() > Date.now()) {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Event is not over yet',
            });
        }

        return getEventPlayback(fetchedEvent);
    }
    catch (e) {
        handleH3Exception(event, e);
    }
});
