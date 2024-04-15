import { createHash, randomBytes } from 'node:crypto';
import jsonwebtoken from 'jsonwebtoken';
import type { GetPublicKeyOrSecret } from 'jsonwebtoken';
import { createError } from 'h3';
import jwksClient from 'jwks-rsa';

function base64URLEncode(str: Buffer) {
    return str
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export function getNavigraphCodeVerifier() {
    return base64URLEncode(randomBytes(32));
}

function sha256(buffer: string) {
    return createHash('sha256').update(buffer).digest();
}

export function getNavigraphCodeChallenge(codeVerifier: string) {
    return base64URLEncode(sha256(codeVerifier));
}

export function getNavigraphRedirectUri() {
    return `${ useRuntimeConfig().DOMAIN }/auth/navigraph`;
}

export function refreshNavigraphToken(refreshToken: string) {
    const config = useRuntimeConfig();
    const form = new URLSearchParams();
    form.set('client_id', config.NAVIGRAPH_CLIENT_ID);
    form.set('client_secret', config.NAVIGRAPH_CLIENT_SECRET);
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);

    return $fetch<{
        access_token: string
        expires_in: number
        token_type: 'Bearer'
        refresh_token: string
    }>('https://identity.api.navigraph.com/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
    });
}

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

export function getNavigraphGwtResult(token: string) {
    return new Promise<JwtToken>((resolve, reject) => {
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
            jsonwebtoken.verify(token, publicCertificate, tokenValidationOptions, (error, decodedAndVerifiedToken) => {
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
}
