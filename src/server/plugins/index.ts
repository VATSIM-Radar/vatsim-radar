import { isDataReady } from '~/utils/backend/storage';

export default defineNitroPlugin(app => {
    app.hooks.hook('request', event => {
        event.context.radarStorageReady = isDataReady();
    });
});

declare module 'h3' {
    interface H3EventContext {
        radarStorageReady: boolean;
    }
}
