import { radarStorage } from '~/utils/server/storage';

export default defineEventHandler(async () => {
    return radarStorage.patreonInfo ?? [];
});
