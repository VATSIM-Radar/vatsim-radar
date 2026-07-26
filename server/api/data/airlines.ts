import { radarStorage } from '~/utils/server/storage';

export default defineEventHandler(event => {
    return radarStorage.airlines;
});
