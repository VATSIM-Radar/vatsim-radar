import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';


export default defineEventHandler(async event => {
    if (radarStorage.vatglasses.activeData === null) {
        return handleH3Error({
            event,
            statusCode: 423,
            data: 'Data is not ready yet',
        });
    }

    return radarStorage.vatglasses.activeData;
});
