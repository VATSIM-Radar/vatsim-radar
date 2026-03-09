import { $fetch } from 'ofetch';
import { getRedisSync, setRedisSync } from '~/utils/server/redis';

export interface FAANotamsResponse {
    status: 'Success';
    data: {
        geojson: {
            properties: {
                coreNOTAMData: {
                    notam: {
                        id?: string;
                        series?: string;
                        number: string;
                        type: string;
                        issued: string;
                        affectedFIR?: string;
                        selectionCode?: string;
                        traffic?: string;
                        purpose?: string;
                        scope?: string;
                        minimumFL?: string;
                        maximumFL?: string;
                        location?: string;
                        icaoLocation?: string;
                        lastUpdated?: string;
                        effectiveStart: string;
                        effectiveEnd: string;
                        text: string;
                        classification: string;
                        schedule?: string;
                    };
                    notamTranslation: {
                        type: 'ICAO';
                        formattedText: string;
                    }[];
                };
            };
        }[];
    };
}

export interface VatsimAirportDataNotam {
    number: string;
    type: 'N' | 'R' | 'C';
    issued: string;
    effectiveFrom: string;
    effectiveTo: string | 'PERM';
    text: string;
    formattedText?: string;
    classification: 'INTL' | 'MIL' | 'DOM' | 'LMIL' | 'FDC';
    schedule?: string;
    id?: string;
    series?: string;
    affectedFIR?: string;
    selectionCode?: string;
    traffic?: string;
    purpose?: string;
    scope?: string;
    minimumFL?: string;
    maximumFL?: string;
    location?: string;
    icaoLocation?: string;
    lastUpdated?: string;
}

export async function getAirportNotams(icao: string, formatted: true): Promise<string[]>;
export async function getAirportNotams(icao: string, formatted?: false): Promise<VatsimAirportDataNotam[]>;
export async function getAirportNotams(icao: string, formatted?: boolean): Promise<VatsimAirportDataNotam[] | string[]>;
export async function getAirportNotams(icao: string, formatted?: boolean): Promise<VatsimAirportDataNotam[] | string[]> {
    const cachedNotamsRedis = await getRedisSync(`${ icao }-notams`);
    const cachedNotams: VatsimAirportDataNotam[] | null = cachedNotamsRedis ? JSON.parse(cachedNotamsRedis) : null;

    if (cachedNotams) {
        return formatted ? cachedNotams.map(x => x.formattedText as string).filter(x => !!x) : cachedNotams;
    }

    const request = await $fetch<VatsimAirportDataNotam[]>(`http://notams.vatsim-radar.com:3000/notams/${ icao }`, {
        timeout: 5000,
    });

    await setRedisSync(`${ icao }-notams`, JSON.stringify(request), 1000 * 60 * 5);

    return formatted ? request.map(x => x.formattedText as string).filter(x => !!x) : request;
}
