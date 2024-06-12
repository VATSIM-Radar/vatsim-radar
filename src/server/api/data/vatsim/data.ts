import { getServerVatsimLiveData, radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';
import type { VatsimLiveDataShort } from '~/types/data/vatsim';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    const isShort = getQuery(event).short === '1';

    if (isShort) {
        return {
            general: radarStorage.vatsim.data!.general,
            pilots: radarStorage.vatsim.regularData!.pilots,
            firs: radarStorage.vatsim.firs,
            locals: radarStorage.vatsim.locals,
            prefiles: radarStorage.vatsim.regularData!.prefiles,
            airports: radarStorage.vatsim.airports,
        } satisfies VatsimLiveDataShort;
    }

    return getServerVatsimLiveData();
});
