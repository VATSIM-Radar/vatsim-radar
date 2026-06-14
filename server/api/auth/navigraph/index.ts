import { ofetch } from 'ofetch';
import { prisma } from '~/utils/server/prisma';
import { getNavigraphGwtResult, getNavigraphRedirectUri } from '~/utils/server/navigraph';
import { handleH3Exception } from '~/utils/server/h3';
import { findUserByCookie } from '~/utils/server/user';
import { createDBUser, getDBUserToken } from '~/utils/db/user';
import { getRedirectURL } from '~/utils/server';

export default defineEventHandler(async event => {
    try {
        const config = useRuntimeConfig();
        const query = getQuery(event) as Record<string, string>;

        const redirectUrl = getRedirectURL(event);

        const { id: verifierId, verifier } = await prisma.auth.findFirstOrThrow({
            select: {
                id: true,
                verifier: true,
            },
            where: {
                state: query.state ?? '',
                NOT: {
                    verifier: null,
                },
            },
        });

        await prisma.auth.delete({ where: { id: verifierId } });

        const params = new URLSearchParams();
        params.set('grant_type', 'authorization_code');
        params.set('code', query.code);
        params.set('redirect_uri', getNavigraphRedirectUri());
        params.set('client_id', config.NAVIGRAPH_CLIENT_ID);
        params.set('client_secret', config.NAVIGRAPH_CLIENT_SECRET);
        params.set('code_verifier', verifier!);

        const token = await ofetch<{
            access_token: string;
            expires_in: number;
            token_type: 'Bearer';
            refresh_token: string;
        }>('https://identity.api.navigraph.com/connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const jwt = await getNavigraphGwtResult(token.access_token);

        const expires = new Date(Date.now() + (token.expires_in * 1000));

        let navigraphUser = await prisma.navigraphUser.findFirst({
            select: {
                user: {
                    select: {
                        id: true,
                        vatsim: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
            where: {
                id: jwt.sub,
            },
        });

        let user = await findUserByCookie(event);
        if (navigraphUser && user && user?.id !== navigraphUser.user.id) {
            await prisma.navigraphUser.delete({
                where: {
                    id: jwt.sub,
                },
            });

            navigraphUser = null;
        }
        else if (navigraphUser?.user.vatsim?.id && !user) {
            return sendRedirect(event, '/api/auth/vatsim/redirect');
        }

        if (navigraphUser) {
            await prisma.navigraphUser.update({
                where: {
                    userId: navigraphUser.user.id,
                },
                data: {
                    accessToken: token.access_token,
                    accessTokenExpire: expires,
                    refreshToken: token.refresh_token,
                    hasFms: !!jwt.subscriptions?.includes('fmsdata'),
                    hasCharts: !!jwt.subscriptions?.includes('charts'),
                },
            });

            return sendRedirect(event, redirectUrl);
        }

        if (!user && !navigraphUser) {
            user = await createDBUser();
            await getDBUserToken(event, user);
        }

        await prisma.navigraphUser.create({
            data: {
                id: jwt.sub,
                accessToken: token.access_token,
                accessTokenExpire: expires,
                refreshToken: token.refresh_token,
                userId: user!.id,
                hasFms: !!jwt.subscriptions?.includes('fmsdata'),
                hasCharts: !!jwt.subscriptions?.includes('charts'),
            },
        });

        return sendRedirect(event, redirectUrl);
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
});
