import { ofetch } from 'ofetch';
import { createError } from 'h3';
import { View } from 'ol';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { radarStorage } from '~/utils/backend/storage';
import { getTraconPrefixes } from '~/utils/shared/vatsim';

export function getVatsimRedirectUri() {
    return `${ useRuntimeConfig().public.DOMAIN }/auth/vatsim`;
}

const view = new View({
    multiWorld: false,
});

const projection = view.getProjection();

export function fromServerLonLat(coordinate: Coordinate) {
    return fromLonLat(coordinate, projection);
}

export function vatsimAuthOrRefresh(code: string, type: 'auth' | 'refresh') {
    const config = useRuntimeConfig();

    const settings: Record<string, any> = {
        grant_type: type === 'refresh' ? 'refresh_token' : 'authorization_code',
        client_id: config.VATSIM_CLIENT_ID,
        client_secret: config.VATSIM_CLIENT_SECRET,
        redirect_uri: getVatsimRedirectUri(),
        scope: ['full_name'],
    };

    if (type === 'refresh') {
        settings.refresh_token = code;
    }
    else {
        settings.code = code;
    }

    return ofetch<{
        access_token: string
        expires_in: number
        token_type: 'Bearer'
        refresh_token: string
        scopes: string[]
    }>(`${ config.VATSIM_ENDPOINT }/oauth/token`, {
        method: 'POST',
        body: settings,
    });
}

export interface VatsimUser {
    cid: string
    personal: {
        name_first: string
        name_last: string
        name_full: string
    }
    oauth: {
        token_valid: 'true' | 'false'
    }
}

export async function vatsimGetUser(token: string) {
    const result = (await ofetch<{data: VatsimUser}>(`${ useRuntimeConfig().VATSIM_ENDPOINT }/api/user`, {
        headers: {
            Authorization: `Bearer ${ token }`,
        },
    })).data;

    if (result.oauth.token_valid !== 'true') {
        throw createError({
            statusCode: 401,
            statusMessage: 'Token is not valid',
        });
    }

    return result;
}

export function findAirportSomewhere(callsign: string) {
    let vatspy = radarStorage.vatspy.data?.airports.find(x => x.iata === callsign || x.icao === callsign);
    if (vatspy) return vatspy;

    const simaware = radarStorage.simaware.data?.features.find(x => x.properties?.id === callsign || getTraconPrefixes(x).some(x => x.split('_')[0] === callsign));
    if (simaware) callsign = simaware.properties?.id;

    vatspy = radarStorage.vatspy.data?.airports.find(x => x.iata === callsign || x.icao === callsign);

    return vatspy ?? simaware;
}
