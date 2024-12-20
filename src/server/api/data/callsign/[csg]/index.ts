import type { Callsign } from '~/utils/backend/storage';
import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(async (event): Promise<Callsign | undefined> => {
    const csg = getRouterParam(event, 'csg');
    if (csg && csg?.length > 3 && radarStorage.callsigns) {
        const csgIcao = csg.substring(0, 3);
        return radarStorage.callsigns.find(x => x.icao === csgIcao ? x : undefined);
    }
});
