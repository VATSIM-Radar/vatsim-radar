import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import type { Sigmets } from '~/utils/backend/storage';
import { radarStorage } from '~/utils/backend/storage';
import { updateAirlines, updateAustraliaData, updateTransceivers } from '~/utils/backend/vatsim/update';
import { getRedis } from '~/utils/backend/redis';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    const redisSubscriber = getRedis();
    redisSubscriber.subscribe('data');
    redisSubscriber.on('message', (_, message) => {
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
    defineCronJob('15 0 * * *', updateAirlines);
    defineCronJob('15 * * * *', async () => {
        const isigmet = $fetch<Sigmets>('https://aviationweather.gov/api/data/isigmet?format=geojson');
        const airsigmet = $fetch<Sigmets>('https://aviationweather.gov/api/data/airsigmet?format=geojson');
        const airsigmet2 = $fetch<Sigmets>('https://aviationweather.gov/api/json/AirmetJSON');
        const gairmet = $fetch<Sigmets>('https://aviationweather.gov/api/data/gairmet?format=geojson');

        radarStorage.sigmets = {
            type: 'FeatureCollection',
            features: [
                ...(await isigmet).features,
                ...(await airsigmet).features,
                ...(await airsigmet2).features,
                ...(await gairmet).features,
            ],
        };
    });
});
