import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(async () => {
    return radarStorage.patreonInfo ?? [];
});
