import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import type { VatsimAchievementUser } from '~/types/data/vatsim';
import { isDebug } from '~/utils/server/debug';

export default defineEventHandler(async (event): Promise<VatsimAchievementUser[] | undefined> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.extendedPilotsMap[cid];
    if (!pilot && !isDebug()) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Pilot with this cid is not found or offline',
        });
        return;
    }

    const achievements = await $fetch<{ data: VatsimAchievementUser[] }>(`https://prams.vatsim.net/api/user/badges/${ cid }`, {
        timeout: 1000 * 10,
    });

    if (achievements.data.length) {
        for (const achievement of radarStorage.vatsimStatic.achievements) {
            const similar = achievements.data.find(x => x.provider_name === achievement.provider_name && x.name === achievement.name);
            if (similar) similar.description = achievement.description;
        }
    }

    return achievements.data;
});
