import { radarStorage } from '~/utils/server/storage';
import type { VatsimAchievementList } from '~/types/data/vatsim';

export default defineEventHandler((): VatsimAchievementList[] => {
    return radarStorage.vatsimStatic.achievements;
});
