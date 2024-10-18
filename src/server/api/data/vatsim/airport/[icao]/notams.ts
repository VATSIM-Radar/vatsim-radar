import { handleH3Exception } from '~/utils/backend/h3';
import { validateAirportIcao } from '~/utils/backend/vatsim';
import { $fetch } from 'ofetch';

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
}

interface FAAResponse {
    pageSize: number;
    pageNum: number;
    totalCount: number;
    totalPages: number;
    items: {
        properties: {
            coreNOTAMData: {
                notam: {
                    number: string;
                    type: string;
                    issued: string;
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
}

export default defineEventHandler(async (event): Promise<VatsimAirportDataNotam[] | undefined> => {
    const icao = validateAirportIcao(event);
    if (!icao) return;

    const config = useRuntimeConfig();

    try {
        const notams: VatsimAirportDataNotam[] = [];

        const url = new URL('https://external-api.faa.gov/notamapi/v1/notams');
        url.searchParams.set('responseFormat', 'geoJson');
        url.searchParams.set('icaoLocation', icao);
        url.searchParams.set('sortBy', 'effectiveStartDate');
        url.searchParams.set('sortOrder', 'Desc');
        url.searchParams.set('pageSize', '1000');

        const data = await $fetch<FAAResponse>(url.toString(), {
            headers: {
                client_id: config.FAA_NOTAMS_CLIENT_ID,
                client_secret: config.FAA_NOTAMS_CLIENT_SECRET,
            },
        });

        for (const notam of data.items) {
            const data = notam.properties.coreNOTAMData.notam;

            if (data.effectiveEnd !== 'PERM' && data.effectiveEnd.startsWith('20') && new Date(data.effectiveEnd).getTime() < Date.now()) continue;

            notams.push({
                number: data.number,
                type: data.type as any,
                issued: data.issued,
                effectiveFrom: data.effectiveStart,
                effectiveTo: data.effectiveEnd,
                text: data.text,
                formattedText: notam.properties.coreNOTAMData.notamTranslation?.[0]?.formattedText,
                classification: data.classification as any,
                schedule: data.schedule || undefined,
            });
        }

        return notams;
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
