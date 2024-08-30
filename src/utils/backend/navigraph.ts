import { createHash, randomBytes } from 'node:crypto';
import jsonwebtoken from 'jsonwebtoken';
import type { GetPublicKeyOrSecret } from 'jsonwebtoken';
import type { H3Event } from 'h3';
import { createError } from 'h3';
import jwksClient from 'jwks-rsa';
import { navigraphCurrentDb, navigraphOutdatedDb } from '~/utils/backend/navigraph-db';
import { fromServerLonLat } from '~/utils/backend/vatsim';
import { handleH3Exception } from '~/utils/backend/h3';
import type { FullUser } from '~/utils/backend/user';
import type { NavigraphGate, NavigraphRunway } from '~/types/data/navigraph';
import { $fetch } from 'ofetch';

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
    return `${ useRuntimeConfig().public.DOMAIN }/api/auth/navigraph`;
}

export function refreshNavigraphToken(refreshToken: string) {
    const config = useRuntimeConfig();
    const form = new URLSearchParams();
    form.set('client_id', config.NAVIGRAPH_CLIENT_ID);
    form.set('client_secret', config.NAVIGRAPH_CLIENT_SECRET);
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);

    return $fetch<{
        access_token: string;
        expires_in: number;
        token_type: 'Bearer';
        refresh_token: string;
    }>('https://identity.api.navigraph.com/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        retry: 3,
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
    iss: string;
    aud: string;
    exp: number;
    nbf: number;
    client_id: string;
    scope: string[];
    sub: string;
    auth_time: string;
    idp: string;
    amr: string[];
    subscriptions: string[];
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

export async function getNavigraphRunways({ user, icao, event }: {
    user: FullUser | null;
    icao: string;
    event: H3Event;
}) {
    try {
        const runways: NavigraphRunway[] = [];

        await new Promise<void>((resolve, reject) => {
            (user?.hasFms ? navigraphCurrentDb : navigraphOutdatedDb)?.each(
                `SELECT runway_identifier, runway_latitude, runway_longitude, landing_threshold_elevation, runway_length, runway_width, runway_magnetic_bearing, runway_true_bearing, airport_identifier FROM tbl_runways WHERE airport_identifier = :icao ORDER BY runway_identifier ASC`,
                { ':icao': icao },
                (err, row: any) => {
                    if (err) return reject(err);

                    const coords = fromServerLonLat([parseFloat(row.runway_longitude), parseFloat(row.runway_latitude)]);

                    runways.push({
                        ...row,
                        runway_latitude: coords[1],
                        runway_longitude: coords[0],
                        landing_threshold_elevation: parseFloat(row.landing_threshold_elevation),
                        runway_length: parseFloat(row.runway_length),
                        runway_width: parseFloat(row.runway_width),
                        runway_magnetic_bearing: parseFloat(row.runway_magnetic_bearing),
                        runway_true_bearing: parseFloat(row.runway_true_bearing),
                    });
                },
                err => {
                    if (err) return reject(err);
                    resolve();
                },
            );
        });

        return runways;
    }
    catch (e) {
        handleH3Exception(event, e);
    }
}

export async function getNavigraphGates({ user, icao, event }: {
    user: FullUser | null;
    icao: string;
    event?: H3Event;
}) {
    let gates: NavigraphGate[] = [];

    if (!navigraphCurrentDb || !navigraphCurrentDb) return gates;

    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject('Failed by timeout'), 5000);

            (user?.hasFms ? navigraphCurrentDb : navigraphOutdatedDb)?.each(
                `SELECT gate_identifier, gate_latitude, gate_longitude, name, airport_identifier FROM tbl_gate WHERE airport_identifier = :icao ORDER BY gate_identifier ASC`,
                { ':icao': icao },
                (err, row: any) => {
                    if (err) return reject(err);

                    const coords = fromServerLonLat([parseFloat(row.gate_longitude), parseFloat(row.gate_latitude)]);

                    gates.push({
                        ...row,
                        gate_longitude: coords[0],
                        gate_latitude: coords[1],
                    });
                },
                err => {
                    clearTimeout(timeout);
                    if (err) return reject(err);
                    resolve();
                },
            );
        });
    }
    catch (e) {
        if (event) {
            handleH3Exception(event, e);
        }
        else throw e;
        return;
    }

    gates.forEach((gate, index) => {
        const nextGate = gates[index + 1];

        if (nextGate) {
            const pairs = [
                ['SE', 'NW'],
                ['SW', 'NE'],
                ['ES', 'WN'],
                ['WS', 'EN'],
                ['N', 'S'],
                ['W', 'E'],
            ];

            for (const pair of pairs) {
                if (
                    (gate.name.endsWith(pair[0]) && nextGate.name.endsWith(pair[1])) ||
                    (gate.name.endsWith(pair[1]) && nextGate.name.endsWith(pair[0]))
                ) {
                    gates.splice(index + 1, 1);
                    gate.name = gate.name.slice(0, gate.name.length - pair[0].length);
                    break;
                }

                if (
                    (gate.name.endsWith(pair[0] + '1') && nextGate.name.endsWith(pair[0] + '2')) ||
                    (gate.name.endsWith(pair[1] + '1') && nextGate.name.endsWith(pair[1] + '2'))
                ) {
                    gates.splice(index + 1, 1);
                    gate.name = gate.name.slice(0, gate.name.length - pair[0].length - 1);
                    break;
                }
            }
        }

        const lrGate = gates.findIndex((x, xIndex) => index < xIndex &&
            (gate.name.endsWith('R') || gate.name.endsWith('L')) &&
            gate.name.slice(-1) === x.name.slice(-2).replace('R', '').replace('L', ''));

        if (lrGate !== -1) {
            gate.gate_longitude = (gate.gate_longitude + gates[lrGate].gate_longitude) / 2;
            gate.gate_latitude = (gate.gate_latitude + gates[lrGate].gate_latitude) / 2;
            gates.splice(lrGate, 1);
        }

        if (gate.name.endsWith('1') && gate.name !== '01') {
            const similarGates = gates.filter(x => x.name.length === gate.name.length &&
                x.name.startsWith(gate.name.slice(0, gate.name.length - 1)) &&
                Math.abs(x.gate_latitude - gate.gate_latitude) < 20 &&
                Math.abs(x.gate_longitude - gate.gate_longitude) < 20);

            if (similarGates.length > 1 && similarGates.length < 9) {
                if (similarGates.length === 2) {
                    gate.gate_longitude = (gate.gate_longitude + gates[1].gate_longitude) / 2;
                    gate.gate_latitude = (gate.gate_latitude + gates[1].gate_latitude) / 2;
                }

                gate.name = gate.name.slice(0, gate.name.length - 1);
                gates = gates.filter(x => !similarGates.some(y => y.name === x.name && y.name !== gate.name));
            }
        }
    });

    return gates;
}
