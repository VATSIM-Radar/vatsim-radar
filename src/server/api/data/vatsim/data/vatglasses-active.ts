import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';


export default defineEventHandler(async event => {
    if (radarStorage.vatglasses.activeData === null) {
        return handleH3Error({
            event,
            statusCode: 423,
            statusMessage: 'Data is not ready yet',
        });
    }

    return radarStorage.vatglasses.activeData;
});
