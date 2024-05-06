import { prisma } from '~/utils/backend/prisma';
import { handleH3Exception } from '~/utils/backend/h3';
import { createDBUser, getDBUserToken } from '~/utils/db/user';
import { vatsimAuthOrRefresh, vatsimGetUser } from '~/utils/backend/vatsim';
import { findUserByCookie } from '~/utils/backend/user';
import { discordClient, discordRoleId, discordServerId } from '~/server/plugins/discord';
import { PermissionFlagsBits } from 'discord.js';
import { getDiscordName } from '~/utils/backend/discord';

export default defineEventHandler(async (event) => {
    try {
        const config = useRuntimeConfig();
        const query = getQuery(event) as Record<string, string>;

        const { id: verifierId, discordId, discordStrategy } = await prisma.auth.findFirstOrThrow({
            select: {
                id: true,
                discordId: true,
                discordStrategy: true,
            },
            where: {
                state: query.state ?? '',
            },
        });

        await prisma.auth.delete({ where: { id: verifierId } });

        const auth = await vatsimAuthOrRefresh(query.code as string, 'auth');

        const vatsimUser = await vatsimGetUser(auth.access_token);

        const expires = new Date(Date.now() + auth.expires_in * 1000);

        const vatsimUserClient = await prisma.vatsimUser.findFirst({
            select: {
                user: {
                    select: {
                        id: true,
                        discordId: true,
                    },
                },
            },
            where: {
                id: vatsimUser.cid,
            },
        });

        let user = await findUserByCookie(event);

        if (discordId && discordStrategy) {
            await prisma.user.updateMany({
                where: {
                    discordId,
                },
                data: {
                    discordId: null,
                    discordStrategy: null,
                },
            });

            const user = await (await discordClient.guilds.fetch(discordServerId)).members.fetch(discordId);
            if (user) {
                await user.roles.add(discordRoleId);
                if (!user.permissions.has(PermissionFlagsBits.Administrator)) {
                    await user.setNickname(getDiscordName(discordStrategy, vatsimUser.personal.name_full, vatsimUser.cid), 'Verification process');
                }
                else {
                    console.log(getDiscordName(discordStrategy, vatsimUser.personal.name_full, vatsimUser.cid));
                }
            }
        }

        if (vatsimUserClient) {
            await prisma.vatsimUser.update({
                where: {
                    userId: vatsimUserClient.user.id,
                },
                data: {
                    accessToken: auth.access_token,
                    accessTokenExpire: expires,
                    refreshToken: auth.refresh_token,
                    fullName: vatsimUser.personal.name_full,
                },
            });

            if (discordId) {
                await prisma.user.update({
                    where: {
                        id: vatsimUserClient.user.id,
                    },
                    data: {
                        discordId,
                    },
                });
            }

            if (!user) {
                await getDBUserToken(event, vatsimUserClient.user);
            }
            return sendRedirect(event, config.public.DOMAIN);
        }

        if (!user) {
            user = await createDBUser({ discordId });
            await getDBUserToken(event, user);
        }

        await prisma.vatsimUser.create({
            data: {
                id: vatsimUser.cid,
                userId: user.id,
                accessToken: auth.access_token,
                accessTokenExpire: expires,
                refreshToken: auth.refresh_token,
                fullName: vatsimUser.personal.name_full,
            },
        });

        return sendRedirect(event, config.public.DOMAIN);
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
});
