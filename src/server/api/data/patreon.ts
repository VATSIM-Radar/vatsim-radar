import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(async () => {
    return await radarStorage.patreonInfo() ?? [];
});
