import { validateDataReady } from '~/utils/backend/h3';
import { getShortInfluxDataForPilots } from '~/utils/backend/influx/converters';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getShortInfluxDataForPilots().join('\n');
});
