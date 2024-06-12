import { ofetch } from 'ofetch';
import { createError } from 'h3';
import { View } from 'ol';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { radarStorage } from '~/utils/backend/storage';
import { getTraconPrefixes } from '~/utils/shared/vatsim';

export function getVatsimRedirectUri() {
    return `${ useRuntimeConfig().public.DOMAIN }/api/auth/vatsim`;
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
        access_token: string;
        expires_in: number;
        token_type: 'Bearer';
        refresh_token: string;
        scopes: string[];
    }>(`${ config.VATSIM_ENDPOINT }/oauth/token`, {
        method: 'POST',
        body: settings,
    });
}

export interface VatsimUser {
    cid: string;
    personal: {
        name_first: string;
        name_last: string;
        name_full: string;
    };
    oauth: {
        token_valid: 'true' | 'false';
    };
}

export async function vatsimGetUser(token: string) {
    const result = (await ofetch<{ data: VatsimUser }>(`${ useRuntimeConfig().VATSIM_ENDPOINT }/api/user`, {
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
    const splittedName = callsign.split('_').slice(0, 2);
    const regularName = splittedName.join('_');
    const callsignAirport = splittedName[0];
    const secondName = splittedName[1];

    let prefix: string | undefined;
    let simaware = radarStorage.simaware.data?.features.find(x => {
        prefix = getTraconPrefixes(x).find(x => x === regularName);
        return !!prefix;
    });

    if (!simaware && secondName) {
        for (let i = 0; i < secondName.length; i++) {
            simaware = radarStorage.simaware.data?.features.find(x => {
                prefix = getTraconPrefixes(x).find(x => x === regularName.substring(0, regularName.length - 1 - i));
                return !!prefix;
            });
            if (simaware) break;
        }

        if (!simaware) {
            simaware = radarStorage.simaware.data?.features.find(x => {
                prefix = getTraconPrefixes(x).find(x => x === callsignAirport);
                return !!prefix;
            });
        }
    }

    let vatspy = radarStorage.vatspy.data?.airports.find(x => x.iata === callsignAirport || x.icao === callsignAirport);
    if (vatspy && simaware) {
        vatspy = {
            ...vatspy,
            isSimAware: true,
        };
    }

    return vatspy ?? simaware;
}

export interface VatsimAirportInfo {
    icao?: string;
    iata?: string;
    name?: string;
    altitude_m?: number;
    altitude_ft?: number;
    transition_alt?: number;
    transition_level?: string;
    transition_level_by_atc?: boolean;
    city?: number;
    country?: string;
    division_id?: string;
    ctafFreq?: string;
}

export async function getVatsimAirportInfo(icao: string): Promise<VatsimAirportInfo> {
    const { data: airportData } = await $fetch<{
        data: VatsimAirportInfo & { stations: { ctaf: boolean; frequency: string }[] };
    }>(`https://my.vatsim.net/api/v2/aip/airports/${ icao }`);

    return {
        icao: airportData?.icao,
        iata: airportData?.iata,
        name: airportData?.name,
        altitude_m: airportData?.altitude_m,
        altitude_ft: airportData?.altitude_ft,
        transition_alt: airportData?.transition_alt,
        transition_level: airportData?.transition_level,
        transition_level_by_atc: airportData?.transition_level_by_atc,
        city: airportData?.city,
        country: airportData?.country,
        division_id: airportData?.division_id,
        ctafFreq: airportData?.stations?.find(x => x.ctaf)?.frequency,
    };
}
