import { isDataReady } from '~/utils/backend/storage';

export default defineEventHandler(() => {
    return {
        ready: isDataReady(),
    };
});
