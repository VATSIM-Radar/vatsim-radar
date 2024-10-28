import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    return {
        events: radarStorage.vatsimStatic.events,
        divisions: radarStorage.vatsimStatic.divisions,
        subDivisions: radarStorage.vatsimStatic.subDivisions,
    };
});
