import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';
import type { VatsimData, VatsimDataShort } from '~/types/data/vatsim';

export default defineEventHandler((event) => {
    if (!validateDataReady(event)) return;
    const isShort = getQuery(event).short === '1';

    if (isShort) {
        return {
            pilots: radarStorage.vatsim.data!.pilots,
            controllers: radarStorage.vatsim.data!.controllers,
            atis: radarStorage.vatsim.data!.atis,
            prefiles: radarStorage.vatsim.data!.prefiles,
        } satisfies VatsimDataShort;
    }

    return JSON.stringify(radarStorage.vatsim.data) as unknown as VatsimData;
});
