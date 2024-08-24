import { ofetch } from 'ofetch';
import type { H3Event } from 'h3';
import { createError } from 'h3';
import { View } from 'ol';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { radarStorage } from '~/utils/backend/storage';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { IVatsimTransceiver } from '~/types/data/vatsim';
import { handleH3Error } from '~/utils/backend/h3';
import type { VatSpyData } from '~/types/data/vatspy';

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

export function findAirportSomewhere(callsign: string, isApp: boolean) {
    const splittedName = callsign.split('_').slice(0, 2);
    const regularName = splittedName.join('_');
    const callsignAirport = splittedName[0];
    const secondName = splittedName[1];

    let prefix: string | undefined;
    let simaware = isApp && radarStorage.simaware.data?.features.find(x => {
        const suffix = getTraconSuffix(x);
        prefix = getTraconPrefixes(x).find(x => x === regularName);
        return !!prefix && (!suffix || callsign.endsWith(suffix));
    });

    if (isApp && !simaware && secondName) {
        for (let i = 0; i < secondName.length; i++) {
            simaware = radarStorage.simaware.data?.features.find(x => {
                const suffix = getTraconSuffix(x);
                prefix = getTraconPrefixes(x).find(x => x === regularName.substring(0, regularName.length - 1 - i));
                return !!prefix && (!suffix || callsign.endsWith(suffix));
            });
            if (simaware) break;
        }

        if (!simaware) {
            simaware = radarStorage.simaware.data?.features.find(x => {
                const suffix = getTraconSuffix(x);
                prefix = getTraconPrefixes(x).find(x => x === callsignAirport);
                return !!prefix && (!suffix || callsign.endsWith(suffix));
            });
        }
    }

    let vatspy = radarStorage.vatspy.data?.keyAirports.iata[callsignAirport];
    let isIata = true;
    if (!vatspy) {
        isIata = false;
        vatspy = radarStorage.vatspy.data?.keyAirports.icao[callsignAirport];
    }

    if (vatspy && simaware) {
        vatspy = {
            ...vatspy,
            isSimAware: true,
        };
    }
    else if (vatspy && isIata && radarStorage.vatspy.data?.keyAirports.icao[callsignAirport]?.icao !== vatspy.iata) {
        vatspy = {
            ...vatspy,
            iata: radarStorage.vatspy.data!.keyAirports.icao[callsignAirport]?.iata,
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

export async function getVatsimAirportInfo(icao: string): Promise<VatsimAirportInfo | null> {
    const airportData = await $fetch<{
        data: VatsimAirportInfo & { stations: { ctaf: boolean; frequency: string }[] };
    }>(`https://my.vatsim.net/api/v2/aip/airports/${ icao }`).catch(() => {});

    if (!airportData?.data.icao) return null;

    return {
        icao: airportData?.data.icao,
        iata: airportData?.data.iata,
        name: airportData?.data.name,
        altitude_m: airportData?.data.altitude_m,
        altitude_ft: airportData?.data.altitude_ft,
        transition_alt: airportData?.data.transition_alt,
        transition_level: airportData?.data.transition_level,
        transition_level_by_atc: airportData?.data.transition_level_by_atc,
        city: airportData?.data.city,
        country: airportData?.data.country,
        division_id: airportData?.data.division_id,
        ctafFreq: airportData?.data.stations?.find(x => x.ctaf)?.frequency,
    };
}

export function getTransceiverData(callsign: string): IVatsimTransceiver {
    const pilot = radarStorage.vatsim.transceivers.find(x => x.callsign === callsign);
    if (!pilot || pilot?.transceivers.length === 0) {
        return {
            frequencies: [],
        };
    }

    const frequencies = pilot.transceivers.map(x => {
        const frequency = parseFloat((x.frequency / 1000000).toFixed(3)).toString();
        if (!frequency.includes('.')) return `${ frequency }.0`;
        return frequency;
    });
    return {
        frequencies,
        groundAlt: pilot.transceivers[0].heightAglM,
        seaAlt: pilot.transceivers[0].heightMslM,
    };
}

export function validateAirportIcao(event: H3Event, detailed: true): { airport: VatSpyData['airports'][0]; icao: string } | undefined;
export function validateAirportIcao(event: H3Event, detailed?: false): string | undefined;
export function validateAirportIcao(event: H3Event, detailed?: boolean): string | { airport: VatSpyData['airports'][0]; icao: string } | undefined {
    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid ICAO',
        });
        return;
    }

    const airport = radarStorage.vatspy.data?.airports.find(x => x.icao === icao);
    if (!airport) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Airport not found',
        });
        return;
    }

    if (detailed) {
        return {
            airport,
            icao,
        };
    }

    return icao;
}
