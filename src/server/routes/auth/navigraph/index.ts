import jwksClient from 'jwks-rsa';
import jsonwebtoken from 'jsonwebtoken';
import type { GetPublicKeyOrSecret } from 'jsonwebtoken';
import { ofetch } from 'ofetch';
import { prisma } from '~/utils/backend/prisma';
import { getNavigraphRedirectUri } from '~/utils/backend/navigraph';
import { createError, getCookie } from 'h3';
import { handleH3Exception } from '~/utils/backend/h3';
import type { RequiredDBUser } from '~/utils/db/user';
import { createDBUser, getDBUserToken } from '~/utils/db/user';
import { findUserByCookie } from '~/utils/backend/user';

const client = jwksClient({
    cache: true,
    jwksRequestsPerMinute: 10,
    jwksUri: 'https://identity.api.navigraph.com/.well-known/jwks',
    rateLimit: true,
});

const tokenValidationOptions = {
    clockTolerance: 300,
    issuer: 'https://identity.api.navigraph.com',
};

interface JwtToken {
    iss: string
    aud: string
    exp: number
    nbf: number
    client_id: string
    scope: string[]
    sub: string
    auth_time: string
    idp: string
    amr: string[]
    subscriptions: string[]
}

export default defineEventHandler(async (event) => {
    try {
        const config = useRuntimeConfig();
        const query = getQuery(event) as Record<string, string>;

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
            access_token: string
            expires_in: number
            token_type: 'Bearer'
            refresh_token: string
        }>('https://identity.api.navigraph.com/connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const jwt = await new Promise<JwtToken>((resolve, reject) => {
            try {
                const publicCertificate: GetPublicKeyOrSecret = async (header, callback) => {
                    try {
                        const signingKey = await client.getSigningKey(header.kid);
                        callback(null, 'publicKey' in signingKey ? signingKey.publicKey : signingKey.rsaPublicKey);
                    }
                    catch (e) {
                        reject(e);
                    }
                };

                // eslint-disable-next-line import/no-named-as-default-member
                jsonwebtoken.verify(token.access_token, publicCertificate, tokenValidationOptions, (error, decodedAndVerifiedToken) => {
                    if (error) {
                        reject(createError({
                            statusMessage: 'Token validation failed',
                            status: 401,
                        }));
                    }
                    else {
                        resolve(decodedAndVerifiedToken as JwtToken);
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });

        const expires = new Date(Date.now() + token.expires_in * 1000);

        const navigraphUser = await prisma.navigraphUser.findFirst({
            select: {
                user: {
                    select: {
                        id: true,
                    },
                },
            },
            where: {
                id: jwt.sub,
            },
        });

        let user = await findUserByCookie(event);

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
                },
            });

            if (!user) {
                await getDBUserToken(event, navigraphUser.user);
            }
            return sendRedirect(event, config.DOMAIN);
        }

        if (!user) {
            user = await createDBUser();
            await getDBUserToken(event, user);
        }

        await prisma.navigraphUser.create({
            data: {
                id: jwt.sub,
                accessToken: token.access_token,
                accessTokenExpire: expires,
                refreshToken: token.refresh_token,
                userId: user.id,
                hasFms: !!jwt.subscriptions?.includes('fmsdata'),
            },
        });

        return sendRedirect(event, config.DOMAIN);
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
});
