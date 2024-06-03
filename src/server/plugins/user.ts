import type { FullUser } from '~/utils/backend/user';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { discordClient } from '~/server/plugins/discord';
import type { GuildMemberRoleManager } from 'discord.js';

export default defineNitroPlugin(app => {
    const config = useRuntimeConfig();

    app.hooks.hook('request', async event => {
        const isPage = !event.path.startsWith('/api') && !event.path.startsWith('/layers') && !event.path.startsWith('/static');

        if ((!config.ACCESS_BY_DISCORD_ROLES || !isPage) && (event.path.startsWith('/api/auth') || (event.path.startsWith('/api/data') && !event.path.includes('navigraph')))) return;

        event.context.user = await findAndRefreshFullUserByCookie(event);

        if (config.ACCESS_BY_DISCORD_ROLES && isPage) {
            const discordId = event.context.user?.discordId;
            event.context.authRestricted = true;
            if (discordId) {
                const guildMember = await (
                    await discordClient.guilds.fetch(config.DISCORD_INTERNAL_SERVER_ID || config.DISCORD_SERVER_ID).catch(console.error)
                )?.members.fetch(discordId).catch(console.error);
                console.log('member', !!guildMember);
                const roles = guildMember?.roles as GuildMemberRoleManager;
                if (roles) {
                    const list = config.ACCESS_BY_DISCORD_ROLES.split(',');
                    console.log([...roles.cache.map(x => x.id)]);
                    event.context.authRestricted = !list.some(x => roles.cache.has(x));
                }
            }
        }
    });
});

declare module 'h3' {
    interface H3EventContext {
        user?: FullUser | null;
        authRestricted?: boolean;
    }
}
