import { radarStorage } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

let cachedVatspy: null | typeof radarStorage.vatspy = null;

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    if (!radarStorage.vatspy.data) return radarStorage.vatspy;

    if (radarStorage.vatspy.version && (!cachedVatspy || radarStorage.vatspy.version !== cachedVatspy.version)) {
        cachedVatspy = {
            version: radarStorage.vatspy.version,
            data: {
                id: radarStorage.vatspy.data.id,
                countries: radarStorage.vatspy.data.countries,
                airports: radarStorage.vatspy.data.airports,
                firs: radarStorage.vatspy.data.firs,
                uirs: radarStorage.vatspy.data.uirs,
                keyAirports: {
                    icao: {},
                    iata: {},
                    realIcao: {},
                    realIata: {},
                },
            },
        };
    }

    return cachedVatspy;
});
