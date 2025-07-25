import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import type { VatsimEvent } from '~/types/data/vatsim';
import { getVATSIMIdentHeaders } from '~/utils/backend';

export default defineEventHandler(async (event): Promise<VatsimEvent | undefined> => {
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
        handleH3Error({
            event,
            statusCode: 400,
        });

        return;
    }

    try {
        return (await $fetch<{ data: VatsimEvent }>(`https://my.vatsim.net/api/v2/events/view/${ id }`, {
            headers: getVATSIMIdentHeaders(),
        })).data;
    }
    catch (e) {
        handleH3Exception(event, e);
    }
});
