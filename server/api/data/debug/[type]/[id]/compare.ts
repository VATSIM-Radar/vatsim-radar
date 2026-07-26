import { handleH3Error } from '~/utils/server/h3';
import { getDiffPolygons, getSimAwareData, getVatSpyData } from '~/utils/server/debug/data-get';
import { vatspyDataToGeojson } from '~/utils/server/vatsim/vatspy';

export default defineEventHandler(async event => {
    const { type, id } = getRouterParams(event);
    if (!type || !id || (type !== 'simaware' && type !== 'vatspy') || isNaN(+id)) {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    if (type === 'vatspy') {
        const data = await getVatSpyData(+id);

        return getDiffPolygons(vatspyDataToGeojson(data), 'vatspy');
    }

    return getDiffPolygons(await getSimAwareData(+id), 'simaware');
});
