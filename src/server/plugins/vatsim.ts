import { CronJob } from 'cron';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision, VatsimTransceiver } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { fork } from 'node:child_process';
import { join } from 'path';

export default defineNitroPlugin(app => {
    let transceiversInProgress = false;

    const path = join(process.cwd(), './src/utils/backend/worker/data-worker.ts');

    const child = fork(path, {
        execArgv: [
            '--import=tsx',
        ],
    });

    child.stderr?.on('data', msg => {
        console.log(Date.now(), msg.toLocaleString());
    });

    child.stdout?.on('data', msg => {
        console.log(Date.now(), msg.toLocaleString());
    });

    child.on('error', err => {
        console.error(Date.now(), err);
    });

    child.on('message', msg => {
        radarStorage.vatsim = JSON.parse(msg.toLocaleString());
    });

    app.hooks.hook('close', () => {
        child.kill();
    });

    async function fetchDivisions() {
        const [divisions, subdivisions] = await Promise.all([
            $fetch<VatsimDivision[]>('https://api.vatsim.net/api/divisions/', {
                timeout: 1000 * 60,
            }),
            $fetch<VatsimSubDivision[]>('https://api.vatsim.net/api/subdivisions/', {
                timeout: 1000 * 60,
            }),
        ]);

        radarStorage.vatsim.divisions = divisions;
        radarStorage.vatsim.subDivisions = subdivisions;
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
            radarStorage.vatsim.events = (await $fetch<{
                data: VatsimEvent[];
            }>('https://my.vatsim.net/api/v2/events/latest')).data;
        },
    });

    CronJob.from({
        cronTime: '* * * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            if (!radarStorage.vatspy.data || transceiversInProgress) return;
            try {
                transceiversInProgress = true;
                radarStorage.vatsim.transceivers = await $fetch<VatsimTransceiver[]>('https://data.vatsim.net/v3/transceivers-data.json', {
                    parseResponse(responseText) {
                        return JSON.parse(responseText);
                    },
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
});
