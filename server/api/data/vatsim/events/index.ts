import { radarStorage } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';

export interface VatsimEventData {
    events: VatsimEvent[];
    divisions: VatsimDivision[];
    subDivisions: VatsimSubDivision[];
}

export default defineEventHandler(async (event): Promise<VatsimEventData | undefined> => {
    if (!(await validateDataReady(event))) return;

    return {
        events: radarStorage.vatsimStatic.events,
        divisions: radarStorage.vatsimStatic.divisions,
        subDivisions: radarStorage.vatsimStatic.subDivisions,
    };
});
