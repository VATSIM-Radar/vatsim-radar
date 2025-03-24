import { getDataVersions } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;

    return {
        ...(await getDataVersions()).vatsim,
        time: Date.now(),
    };
});
