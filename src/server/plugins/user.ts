import type { FullUser } from '~/utils/backend/user';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';

export default defineNitroPlugin((app) => {
    app.hooks.hook('request', async (event) => {
        if (event.path.startsWith('/auth') || (event.path.startsWith('/data') && !event.path.includes('navigraph'))) return;

        event.context.user = await findAndRefreshFullUserByCookie(event);
    });
});

declare module 'h3' {
    interface H3EventContext {
        user?: FullUser | null
    }
}
