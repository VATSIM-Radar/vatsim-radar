import { handleH3Exception } from '~/utils/backend/h3';
import { validateAirportIcao } from '~/utils/backend/vatsim';

export interface VatsimAirportDataNotam {
    title: string;
    content: string;
    startDate?: number;
    endDate?: number;
}

const regex = new RegExp('<b>(?<title>.*)</b> - (?<content>[\\s\\S]*?)<\\/PRE>', 'g');
const dateRegex = new RegExp('(?<startDate>\\d{2} \\w{3} \\d{2}:\\d{2} \\d{4}) UNTIL (?<endDate>\\d{2} \\w{3} \\d{2}:\\d{2} \\d{4})');

export default defineEventHandler(async (event): Promise<VatsimAirportDataNotam[] | undefined> => {
    const icao = validateAirportIcao(event);
    if (!icao) return;

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
            const content = result.groups?.content?.trim() ?? '';

            const dates = dateRegex.exec(content);
            let startDate: number | undefined;
            let endDate: number | undefined;

            if (dates?.groups) {
                if (dates?.groups?.startDate) {
                    startDate = new Date(`${ dates.groups.startDate } UTC+0`).getTime();
                }

                if (dates?.groups?.endDate) {
                    endDate = new Date(`${ dates.groups.endDate } UTC+0`).getTime();
                }
            }

            notams.push({
                title: result.groups?.title?.replaceAll('</b>', '').trim() ?? '',
                content,
                startDate,
                endDate,
            });
        }

        return notams;
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
