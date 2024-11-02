import { CronJob } from 'cron';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision, VatsimTransceiver } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { updateAustraliaData } from '~/utils/backend/vatsim/update';
import { redis } from '~/utils/backend/redis';

export default defineNitroPlugin(app => {
    let transceiversInProgress = false;

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

    CronJob.from({
        cronTime: '15 0 * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            await fetchDivisions();
        },
    });

    CronJob.from({
        cronTime: '30 * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            const myData = await $fetch<{
                data: VatsimEvent[];
            }>('https://my.vatsim.net/api/v2/events/latest');
            const inFourWeeks = new Date();
            inFourWeeks.setDate(inFourWeeks.getDate() + 28);
            radarStorage.vatsimStatic.events = myData.data.filter(e => new Date(e.start_time) < inFourWeeks);
        },
    });

    CronJob.from({
        cronTime: '* * * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            if (transceiversInProgress) return;
            try {
                transceiversInProgress = true;
                radarStorage.vatsim.transceivers = await $fetch<VatsimTransceiver[]>('https://data.vatsim.net/v3/transceivers-data.json', {
                    timeout: 1000 * 30,
                });
            }
            catch (e) {
                console.error(e);
            }
            finally {
                transceiversInProgress = false;
            }
        },
    });

    CronJob.from({
        cronTime: '15 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
            await updateAustraliaData();
        },
    });
});
