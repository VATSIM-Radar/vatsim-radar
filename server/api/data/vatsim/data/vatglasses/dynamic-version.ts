import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';


export default defineEventHandler(async event => {
    if (radarStorage.vatglasses.dynamicData.version === '') {
        handleH3Error({
            event,
            statusCode: 423,
            data: 'Data is not ready yet',
        });
        return;
    }

    return radarStorage.vatglasses.dynamicData.version;
});
