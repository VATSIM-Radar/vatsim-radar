import { validateDataReady } from '~/utils/server/h3';
import { getShortQuestDBDataForPilots, questDBRowsToLineProtocol } from '~/utils/server/questdb/converters';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return questDBRowsToLineProtocol(getShortQuestDBDataForPilots()).join('\n');
});
