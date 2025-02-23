import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';

export interface VatsimEventData {
    events: VatsimEvent[];
    divisions: VatsimDivision[];
    subDivisions: VatsimSubDivision[];
}

export default defineEventHandler(async (event): Promise<VatsimEventData | undefined> => {
    if (!(await validateDataReady(event))) return;

    return {
        events: await radarStorage.vatsimStatic.events(),
        divisions: await radarStorage.vatsimStatic.divisions(),
        subDivisions: await radarStorage.vatsimStatic.subDivisions(),
    };
});
