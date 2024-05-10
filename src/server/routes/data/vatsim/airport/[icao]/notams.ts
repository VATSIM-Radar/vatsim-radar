import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import { MultiPolygon } from 'ol/geom';
import { fromServerLonLat } from '~/utils/backend/vatsim';

export interface VatsimAirportDataNotam {
        title: string
        content: string
}

const regex = new RegExp('<b>(?<title>.*) - (?<content>[\\s\\S]*?)<\\/PRE>', 'g');

export default defineEventHandler(async (event): Promise<VatsimAirportDataNotam[] | undefined> => {
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

    try {
        const notams: VatsimAirportDataNotam[] = [];

        const formData = new FormData();

        formData.set('retrieveLocId', icao);
        formData.set('reportType', 'Report');
        formData.set('actionType', 'notamRetrievalByICAOs');
        formData.set('submit', 'View NOTAMs');

        const html = await $fetch<string>('https://www.notams.faa.gov/dinsQueryWeb/queryRetrievalMapAction.do', {
            headers: {
                'User-Agent': 'VatsimRadar/0.0',
            },
            method: 'POST',
            responseType: 'text',
            body: formData,
        });

        let result: RegExpExecArray | null;

        while ((result = regex.exec(html)) !== null) {
            notams.push({
                title: result.groups?.title?.replaceAll('</b>', '').trim() ?? '',
                content: result.groups?.content?.trim() ?? '',
            });
        }

        return notams;
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
