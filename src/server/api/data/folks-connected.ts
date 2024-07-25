import { validateDataReady } from '~/utils/backend/h3';
import { wss } from '~/utils/backend/vatsim/ws';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    return {
        size: wss.clients.size,
    };
});
