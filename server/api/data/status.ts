import { isDataReady } from '~/utils/server/storage';

export default defineEventHandler(() => {
    return {
        ready: isDataReady(),
    };
});
