import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { updateAustraliaData, updateTransceivers } from '~/utils/backend/vatsim/update';
import { redis } from '~/utils/backend/redis';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    redis.subscribe('data');
    redis.on('message', (_, message) => {
        radarStorage.vatsim = JSON.parse(message);
    });

    async function fetchDivisions() {
        const [divisions, subdivisions] = await Promise.all([
            $fetch<VatsimDivision[]>('https://api.vatsim.net/api/divisions/', {
                timeout: 1000 * 60,
                retry: 5,
            }),
            $fetch<VatsimSubDivision[]>('https://api.vatsim.net/api/subdivisions/', {
                timeout: 1000 * 60,
                retry: 5,
            }),
        ]);

        radarStorage.vatsimStatic.divisions = divisions;
        radarStorage.vatsimStatic.subDivisions = subdivisions;
    }

    defineCronJob('30 * * * *', async () => {
        const myData = await $fetch<{
            data: VatsimEvent[];
        }>('https://my.vatsim.net/api/v2/events/latest');
        const inFourWeeks = new Date();
        inFourWeeks.setDate(inFourWeeks.getDate() + 28);
        radarStorage.vatsimStatic.events = myData.data.filter(e => new Date(e.start_time) < inFourWeeks);
    });

    defineCronJob('15 0 * * *', fetchDivisions);
    defineCronJob('* * * * * *', updateTransceivers);
    defineCronJob('15 * * * *', updateAustraliaData);
});
