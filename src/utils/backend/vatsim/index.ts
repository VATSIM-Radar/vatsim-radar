import { ofetch } from 'ofetch';
import type { H3Event } from 'h3';
import { createError } from 'h3';
import type { SimAwareData } from '~/utils/backend/storage';
import { radarStorage } from '~/utils/backend/storage';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { IVatsimTransceiver } from '~/types/data/vatsim';
import { handleH3Error } from '~/utils/backend/h3';
import type { VatSpyAirport, VatSpyData } from '~/types/data/vatspy';
import { getVATSIMIdentHeaders } from '~/utils/backend';

export function getVatsimRedirectUri() {
    return `${ useRuntimeConfig().public.DOMAIN }/api/auth/vatsim`;
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
            data: 'Token is not valid',
        });
    }

    return result;
}

export function findAirportSomewhere({ callsign, vatspy: vatspyData, simaware: simawareData, isApp }: {
    callsign: string; isApp: boolean; vatspy: VatSpyData; simaware: SimAwareData;
}): VatSpyAirport | SimAwareData['features'][0] {
    const splittedName = callsign.split('_').slice(0, 2);
    const regularName = splittedName.join('_');
    const callsignAirport = splittedName[0];
    const secondName = splittedName[1];

    let prefix: string | undefined;
    let simaware = isApp && simawareData?.features.find(x => {
        const suffix = getTraconSuffix(x);
        prefix = getTraconPrefixes(x).find(x => x === regularName);
        return !!prefix && (!suffix || callsign.endsWith(suffix));
    });

    if (isApp && !simaware && secondName) {
        for (let i = 0; i < secondName.length; i++) {
            simaware = simawareData?.features.find(x => {
                const suffix = getTraconSuffix(x);
                prefix = getTraconPrefixes(x).find(x => x === regularName.substring(0, regularName.length - 1 - i));
                return !!prefix && (!suffix || callsign.endsWith(suffix));
            });
            if (simaware) break;
        }

        if (!simaware) {
            simaware = simawareData?.features.find(x => {
                const suffix = getTraconSuffix(x);
                prefix = getTraconPrefixes(x).find(x => x === callsignAirport);
                return !!prefix && (!suffix || callsign.endsWith(suffix));
            });
        }
    }

    let vatspy = vatspyData?.keyAirports.realIata[callsignAirport] || vatspyData?.keyAirports.iata[callsignAirport];
    const icao = vatspyData?.keyAirports.realIcao[callsignAirport] || vatspyData?.keyAirports.icao[callsignAirport];
    let isIata = true;
    if (!vatspy) {
        isIata = false;
        vatspy = icao;
    }

    if (vatspy && simaware) {
        vatspy = {
            ...vatspy,
            isSimAware: true,
        };
    }
    else if (vatspy && isIata && icao && icao.iata !== vatspy.iata) {
        vatspy = {
            ...vatspy,
            iata: icao.iata,
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
    }>(`https://my.vatsim.net/api/v2/aip/airports/${ icao }`, { headers: getVATSIMIdentHeaders() }).catch(() => {});

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

export function getHzFrequency(freq: number): string {
    let frequency = parseFloat((freq / 1000000).toFixed(3)).toString();

    if (!frequency.includes('.')) {
        if (frequency.length < 3) {
            for (let i = 0; i < 3 - frequency.length; i++) {
                frequency += '0';
            }
        }

        frequency += '.';
    }

    return `${ (`${ frequency }000`).slice(0, 7) }`;
}

export function getTransceiverData(callsign: string): IVatsimTransceiver {
    const transceiver = radarStorage.vatsim.transceivers.find(x => x.callsign === callsign);

    if (!transceiver || transceiver?.transceivers.length === 0) {
        return {
            frequencies: [],
        };
    }

    const frequencies = transceiver.transceivers.map(x => getHzFrequency(x.frequency));

    return {
        frequencies: [...new Set(frequencies)],
        groundAlt: transceiver.transceivers[0].heightAglM,
        seaAlt: transceiver.transceivers[0].heightMslM,
    };
}

export async function validateAirportIcao(event: H3Event, detailed: true): Promise<{
    airport: VatSpyData['airports'][0];
    icao: string;
} | undefined>;
export async function validateAirportIcao(event: H3Event, detailed?: false): Promise<string | undefined>;
export async function validateAirportIcao(event: H3Event, detailed?: boolean): Promise<string | {
    airport: VatSpyData['airports'][0];
    icao: string;
} | undefined> {
    const vatspy = (radarStorage.vatspy)!;

    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid ICAO',
        });
        return;
    }

    const airport = vatspy.data?.airports.find(x => x.icao === icao);
    if (!airport) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Airport not found',
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
