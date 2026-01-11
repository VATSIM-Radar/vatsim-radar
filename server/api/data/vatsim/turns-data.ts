import { validateDataReady } from '~/utils/server/h3';
import { getShortInfluxDataForPilots } from '~/utils/server/influx/converters';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getShortInfluxDataForPilots().join('\n');
});
