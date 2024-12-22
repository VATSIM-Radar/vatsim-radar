import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimPrefile } from '~/types/data/vatsim';

export default defineEventHandler((event): VatsimPrefile | undefined => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.data?.prefiles.find(x => x.cid === +cid);
    if (!pilot) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Prefile with this cid was not found',
        });
        return;
    }

    return pilot;
});
