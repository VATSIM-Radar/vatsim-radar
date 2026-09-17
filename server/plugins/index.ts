import { isDataReady } from '~/utils/server/storage';

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
