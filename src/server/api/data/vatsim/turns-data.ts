import { validateDataReady } from '~/utils/backend/h3';
import { getShortInfluxDataForPilots } from '~/utils/backend/influx/converters';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    return getShortInfluxDataForPilots().join('\n');
});
