import { radarStorage } from '~/utils/backend/storage';

export default defineNitroPlugin((app) => {
    app.hooks.hook('request', (event) => {
        event.context.radarStorage = radarStorage;
    });
});

declare module 'h3' {
    interface H3EventContext {
        radarStorage: typeof radarStorage;
    }
}
