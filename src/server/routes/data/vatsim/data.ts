import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';
import type { VatsimRegularData, VatsimRegularDataShort } from '~/types/data/vatsim';

export default defineEventHandler((event) => {
    if (!validateDataReady(event)) return;
    const isShort = getQuery(event).short === '1';

    if (isShort) {
        return {
            pilots: radarStorage.vatsim.regularData!.pilots,
            controllers: radarStorage.vatsim.regularData!.controllers,
            atis: radarStorage.vatsim.regularData!.atis,
            prefiles: radarStorage.vatsim.regularData!.prefiles,
        } satisfies VatsimRegularDataShort;
    }

    return radarStorage.vatsim.regularData as VatsimRegularData;
});
