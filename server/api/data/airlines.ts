import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(event => {
    return radarStorage.airlines;
});
