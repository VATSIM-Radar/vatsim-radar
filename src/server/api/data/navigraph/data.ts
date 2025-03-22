import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(event => {
    return radarStorage.navigraphData?.short.current ?? 'no';
});
