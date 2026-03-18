import { radarStorage } from '~/utils/backend/storage';
import type { VatsimAchievementList } from '~/types/data/vatsim';

export default defineEventHandler((): VatsimAchievementList[] => {
    return radarStorage.vatsimStatic.achievements;
});
