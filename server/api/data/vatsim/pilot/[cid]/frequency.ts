import { findFrequencyForPilot } from '~/utils/server/vatglasses-frequency';
import { handleH3Error } from '~/utils/server/h3';

export default defineEventHandler(event => {
    const cid = getRouterParam(event, 'cid');

    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Missing CID parameter',
        });
        return;
    }

    try {
        const frequencyData = findFrequencyForPilot(cid);
        return {
            data: frequencyData,
        };
    }
    catch {
        handleH3Error({
            event,
            statusCode: 500,
            data: 'Internal Server Error',
        });
    }
});
