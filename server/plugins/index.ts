import { isDataReady } from '~/utils/backend/storage';
import { prisma } from '~/utils/backend/prisma';
import { defaultRedis, getRedisSync } from '~/utils/backend/redis';
import { UserPresetType } from '@prisma/client';
import type { UserBookmarkPreset } from '~/utils/backend/handlers/bookmarks';
import { toLonLat } from 'ol/proj';

export default defineNitroPlugin(async app => {
    app.hooks.hook('request', async event => {
        event.context.radarStorageReady = await isDataReady();
        appendResponseHeader(event, 'Vary', ['Content-Security-Policy', 'Origin']);
    });

    const appliedBookmarksMigration = await getRedisSync('bookmarks-migration');

    if (!appliedBookmarksMigration) {
        const bookmarks = await prisma.userPreset.findMany({
            where: {
                type: UserPresetType.BOOKMARK,
            },
            orderBy: [
                {
                    order: 'asc',
                },
                {
                    id: 'desc',
                },
            ],
        });

        for (const _bookmark of bookmarks) {
            const bookmark = _bookmark as UserBookmarkPreset;

            if (bookmark.json.coords?.length && bookmark.json.coords[0].toString().split('.')[0].length > 5) {
                await prisma.userPreset.update({
                    where: {
                        id: bookmark.id,
                    },
                    data: {
                        json: {
                            // @ts-expect-error I don't know why it says that
                            ...bookmark.json,
                            coords: toLonLat(bookmark.json.coords),
                        },
                    },
                });
            }
        }

        defaultRedis.set('bookmarks-migration', '1');
    }
});

declare module 'h3' {
    interface H3EventContext {
        radarStorageReady: boolean;
    }
}
