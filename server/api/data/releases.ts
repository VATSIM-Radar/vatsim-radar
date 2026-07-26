import { handleH3Error, handleH3Exception } from '~/utils/server/h3';
import { getRedisSync, setRedisSync } from '~/utils/server/redis';
import { getDesktopAppRelease } from '~/utils/server/github';

export default defineEventHandler(async event => {
    try {
        const cache = await getRedisSync('desktop-app-response');
        if (cache) {
            if (cache === 'null') return handleH3Error({ event, statusCode: 404 });
            setResponseHeader(event, 'Content-Type', 'application/json');
            return cache;
        }

        const response = await getDesktopAppRelease();
        if (!response?.files.length) {
            await setRedisSync('desktop-app-response', 'null', 1000 * 60 * 60);
            return handleH3Error({ event, statusCode: 404 });
        }

        await setRedisSync('desktop-app-response', JSON.stringify(response), 1000 * 60 * 60);
        return response;
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
