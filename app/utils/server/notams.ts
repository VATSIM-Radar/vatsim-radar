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
    const config = useRuntimeConfig();
    const clientId = config.FAA_NOTAMS_CLIENT_ID ?? process.env.FAA_NOTAMS_CLIENT_ID;
    const clientSecret = config.FAA_NOTAMS_CLIENT_SECRET ?? process.env.FAA_NOTAMS_CLIENT_SECRET;

    if (!clientId || !clientSecret) return [];

    let faaToken = await getRedisSync('faa-token');
    if (!faaToken) {
        const params = new URLSearchParams();
        params.set('grant_type', 'client_credentials');

        const faaTokenRequest = await $fetch<{
            access_token: string;
            expires_in: string;
        }>('https://api-nms.aim.faa.gov/v1/auth/token', {
            method: 'POST',
            body: params,
            headers: {
                Authorization: `Basic ${ btoa(`${ clientId }:${ clientSecret }`) }`,
            },
        });
        faaToken = faaTokenRequest.access_token;
        await setRedisSync('faa-token', faaToken, Date.now() + (1000 * 60 * (Number(faaTokenRequest.expires_in) - 5)));
    }

    const cachedNotamsRedis = await getRedisSync(`${ icao }-notams`);
    const cachedNotams: VatsimAirportDataNotam[] | null = cachedNotamsRedis ? JSON.parse(cachedNotamsRedis) : null;

    if (cachedNotams) {
        return formatted ? cachedNotams.map(x => x.formattedText as string).filter(x => !!x) : cachedNotams;
    }

    const notams: VatsimAirportDataNotam[] = [];
    const notamsText: string[] = [];

    const url = new URL('https://api-nms.aim.faa.gov/nmsapi/v1/notams');
    url.searchParams.set('nmsResponseFormat', 'geoJson');
    url.searchParams.set('location', icao);

    const data = await $fetch<FAANotamsResponse>(url.toString(), {
        headers: {
            Authorization: `Bearer ${ faaToken }`,
            nmsResponseFormat: 'GEOJSON',
        },
    });

    if (!Array.isArray(data?.data?.geojson)) return [];

    for (const notam of data.data.geojson.toSorted((a, b) => new Date(b.properties.coreNOTAMData.notam.effectiveStart).getTime() - new Date(a.properties.coreNOTAMData.notam.effectiveStart).getTime())) {
        const data = notam.properties.coreNOTAMData.notam;

        if (data.effectiveEnd !== 'PERM' && data.effectiveEnd.startsWith('20') && new Date(data.effectiveEnd).getTime() < Date.now()) continue;

        const formattedText = notam.properties.coreNOTAMData.notamTranslation?.find(x => x.type === 'ICAO')?.formattedText;

        notams.push({
            number: data.number,
            type: data.type as any,
            issued: data.issued,
            effectiveFrom: data.effectiveStart,
            effectiveTo: data.effectiveEnd,
            text: data.text,
            formattedText: formattedText,
            classification: data.classification as any,
            schedule: data.schedule || undefined,
            scope: data.scope,
        });

        if (formatted && formattedText) notamsText.push(formattedText);
    }

    await setRedisSync(`${ icao }-notams`, JSON.stringify(notams), 1000 * 60 * 5);

    return formatted ? notamsText : notams;
}
