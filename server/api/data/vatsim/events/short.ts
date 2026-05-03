import { radarStorage } from '~/utils/server/storage';
import { handleH3Error, validateDataReady } from '~/utils/server/h3';
import type { VatsimActiveEvent, VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';

export interface VatsimEventData {
    events: VatsimEvent[];
    divisions: VatsimDivision[];
    subDivisions: VatsimSubDivision[];
}

export default defineEventHandler(async (event): Promise<VatsimActiveEvent[] | undefined> => {
    if (!(await validateDataReady(event))) return;

    const query = getQuery<{ starting: string }>(event);
    const start = new Date(parseInt(query.starting as string)).getTime();
    const now = Date.now();

    if (isNaN(start)) {
        handleH3Error({
            statusCode: 400,
            event,
        });
        return;
    }

    const events = radarStorage.vatsimStatic.events.filter(x => {
        const startTime = new Date(x.start_time).getTime();
        const endTime = new Date(x.end_time).getTime();

        // Already over
        if (now >= endTime) return false;

        // Already started
        if (now >= startTime) return true;

        return start > startTime;
    });

    return events.map(x => ({
        id: x.id,
        name: x.name,
        start_time: x.start_time,
        end_time: x.end_time,
        airports: x.airports,
        type: x.type,
    } satisfies VatsimActiveEvent));
});
