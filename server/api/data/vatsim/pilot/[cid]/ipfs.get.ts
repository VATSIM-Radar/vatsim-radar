import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import type { IpfsUser } from '~/types/data/vatsim';

export default defineEventHandler(async (event): Promise<IpfsUser | undefined> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.extendedPilotsMap[cid];
    if (!pilot) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Pilot with this cid is not found or offline',
        });
        return;
    }

    const viffData = await $fetch<IpfsUser>(`https://viff-system.network/ifps/callsign?callsign=${ pilot.callsign }&profile=false`, {
        timeout: 1000 * 10,
    }).catch(() => {});

    if (!viffData) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'User is not in VIFF system',
        });

        return;
    }

    return viffData;
});
