import { radarStorage } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';
import type { VatsimEvent, VatsimEventShort, VatsimEventType } from '~/types/data/vatsim';
import { getRedisSync, setRedisSync } from '~/utils/server/redis.ts';
import { prisma } from '~/utils/server/prisma.ts';

export interface VatsimEventData {
    events: VatsimEvent[];
    pastEvents: VatsimEventShort[];
}

export default defineEventHandler(async (event): Promise<VatsimEventData | undefined> => {
    if (!(await validateDataReady(event))) return;

    const query = getQuery(event);

    let skip = 0;

    if (typeof query.page === 'string' && !isNaN(+query.page)) {
        let page = +query.page;
        if (page < 1) page = 1;

        skip = (page - 1) * 50;
    }

    const cacheKey = `events-offset-${ skip }`;
    const eventsCache = await getRedisSync(cacheKey);

    const pastEvents = eventsCache
        ? JSON.parse(eventsCache)
        : (await prisma.vatsimEvent.findMany({
            take: 50,
            skip,
            orderBy: [
                {
                    id: 'desc',
                },
            ],
        })).map(event => ({
            id: event.id,
            type: event.type as VatsimEventType,
            name: event.name,
            link: event.link,
            organisers: event.organisers as VatsimEvent['organisers'],
            airports: event.airports as VatsimEvent['airports'],
            start_time: event.startTime.toISOString(),
            end_time: event.endTime.toISOString(),
            short_description: event.shortDescription,
            description: event.description,
            banner: event.banner,
        } satisfies VatsimEventShort));

    if (pastEvents.length && !eventsCache) {
        await setRedisSync(cacheKey, JSON.stringify(pastEvents), 1000 * 60 * 30);
    }

    return {
        events: radarStorage.vatsimStatic.events,
        pastEvents,
    };
});
