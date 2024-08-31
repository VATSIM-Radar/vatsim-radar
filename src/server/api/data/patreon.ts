import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(() => {
    return radarStorage.patreonInfo;
});
