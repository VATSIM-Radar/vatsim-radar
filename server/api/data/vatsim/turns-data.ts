import { validateDataReady } from '~/utils/server/h3';
import { getShortQuestDBDataForPilots } from '~/utils/server/questdb/converters';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getShortQuestDBDataForPilots().join('\n');
});
