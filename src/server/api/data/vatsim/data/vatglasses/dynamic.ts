import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';


export default defineEventHandler(async event => {
    if (radarStorage.vatglasses.dynamicData.data === null) {
        handleH3Error({
            event,
            statusCode: 423,
            data: 'Data is not ready yet',
        });
        return;
    }

    return radarStorage.vatglasses.dynamicData;
});
