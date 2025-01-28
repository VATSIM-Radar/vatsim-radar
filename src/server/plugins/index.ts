import { isDataReady } from '~/utils/backend/storage';

export default defineNitroPlugin(app => {
    app.hooks.hook('request', event => {
        event.context.radarStorageReady = isDataReady();
        appendResponseHeader(event, 'Vary', ['Content-Security-Policy', 'Origin']);
    });
});

declare module 'h3' {
    interface H3EventContext {
        radarStorageReady: boolean;
    }
}
