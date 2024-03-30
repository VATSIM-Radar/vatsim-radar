import { CronJob } from 'cron';
import { ofetch } from 'ofetch';
import type { VatsimData, VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';

let abort: AbortController | null = null;

function excludeKeys<S extends {
    [K in keyof D]?: D[K] extends Array<any> ? {
        [KK in keyof D[K][0]]?: true
    } : never
}, D extends VatsimData>(data: D, excluded: S): {
    [K in keyof D]: D[K] extends Array<any> ? Array<Omit<D[K][0], keyof S[K]>> : D[K]
} {
    const newData = {} as ReturnType<typeof excludeKeys<S, D>>;

    for (const key in data) {
        const items = data[key];
        const toExclude = excluded[key];
        if (!toExclude || !Array.isArray(items)) {
            newData[key] = data[key] as any;
            continue;
        }

        const excludedKeys = Object.keys(toExclude);

        newData[key] = items.map(item => Object.fromEntries(Object.entries(item).filter(([x]) => !excludedKeys.includes(x)))) as any;
    }

    return newData;
}

export default defineNitroPlugin((app) => {
    CronJob.from({
        cronTime: '*/5 * * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            try {
                abort?.abort();
                abort = new AbortController();
                radarStorage.vatsim.data = await ofetch<VatsimData>('https://data.vatsim.net/v3/vatsim-data.json', { signal: abort.signal });
                radarStorage.vatsim.regularData = excludeKeys(radarStorage.vatsim.data, {
                    pilots: {
                        server: true,
                        transponder: true,
                        qnh_mb: true,
                        qnh_i_hb: true,
                        flight_plan: true,
                        last_updated: true,
                    },
                    controllers: {
                        server: true,
                        last_updated: true,
                    },
                    atis: {
                        server: true,
                        last_updated: true,
                    },
                    prefiles: {
                        flight_plan: true,
                        last_updated: true,
                    },
                });
            }
            catch (e) {
                console.error(e);
            }
            finally {
                abort = null;
            }
        },
    });

    async function fetchDivisions() {
        const [divisions, subdivisions] = await Promise.all([
            $fetch<VatsimDivision[]>('https://api.vatsim.net/api/divisions/'),
            $fetch<VatsimSubDivision[]>('https://api.vatsim.net/api/subdivisions/'),
        ]);

        radarStorage.vatsim.divisions = divisions;
        radarStorage.vatsim.subDivisions = subdivisions;
    }

    CronJob.from({
        cronTime: '0 0 * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            await fetchDivisions();
        },
    });

    CronJob.from({
        cronTime: '0 * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            radarStorage.vatsim.events = (await $fetch<{data: VatsimEvent[]}>('https://my.vatsim.net/api/v2/events/latest')).data;
        },
    });
});
