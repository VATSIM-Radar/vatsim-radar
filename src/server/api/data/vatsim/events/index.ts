import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';

export interface VatsimEventData {
    events: VatsimEvent[];
    divisions: VatsimDivision[];
    subDivisions: VatsimSubDivision[];
}

export default defineEventHandler((event): VatsimEventData | undefined => {
    if (!validateDataReady(event)) return;

    return {
        events: radarStorage.vatsimStatic.events,
        divisions: radarStorage.vatsimStatic.divisions,
        subDivisions: radarStorage.vatsimStatic.subDivisions,
    };
});
