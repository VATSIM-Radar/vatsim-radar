import { isDataReady } from '~/utils/server/storage';
import { prisma } from '~/utils/server/prisma';
import { defaultRedis, getRedisSync } from '~/utils/server/redis';
import { UserPresetType } from '#prisma';
import type { UserBookmarkPreset } from '~/utils/server/handlers/bookmarks';
import { toLonLat } from 'ol/proj.js';

export default defineNitroPlugin(async app => {
    app.hooks.hook('request', async event => {
        event.context.radarStorageReady = await isDataReady();
        appendResponseHeader(event, 'Vary', ['Content-Security-Policy', 'Origin']);
    });
});

declare module 'h3' {
    interface H3EventContext {
        radarStorageReady: boolean;
    }
}
