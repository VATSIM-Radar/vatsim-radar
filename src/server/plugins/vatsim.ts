import { CronJob } from 'cron';
import { ofetch } from 'ofetch';
import type { VatsimData, VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { getAirportsList, getATCBounds, getLocalATC } from '~/utils/data/vatsim';
import { fromServerLonLat } from '~/utils/backend/vatsim';

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
    let latestFinished = 0;
    let isInProgress = false;

    CronJob.from({
        cronTime: '* * * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            if (!radarStorage.vatspy.data || isInProgress || Date.now() - latestFinished < 1000) return;
            try {
                isInProgress = true;
                const data = await ofetch<VatsimData>('https://data.vatsim.net/v3/vatsim-data.json');

                if (radarStorage.vatsim.data?.general) {
                    if (new Date(radarStorage.vatsim.data.general.update_timestamp).getTime() >= new Date(data.general.update_timestamp).getTime()) return;
                }

                data.pilots = data.pilots.map((x) => {
                    const coords = fromServerLonLat([x.longitude, x.latitude]);

                    return {
                        ...x,
                        longitude: coords[0],
                        latitude: coords[1],
                    };
                }).filter((x, index) => !data.pilots.some((y, yIndex) => y.cid === x.cid && yIndex < index));

                data.prefiles = data.prefiles.filter((x, index) => !data.pilots.some(y => x.cid === y.cid) && !data.prefiles.some((y, yIndex) => y.cid === x.cid && yIndex > index));

                radarStorage.vatsim.data = data;

                const regularData = excludeKeys(radarStorage.vatsim.data, {
                    pilots: {
                        server: true,
                        transponder: true,
                        qnh_mb: true,
                        qnh_i_hg: true,
                        flight_plan: true,
                        last_updated: true,
                        logon_time: true,
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

                radarStorage.vatsim.regularData = {
                    ...regularData,
                    pilots: regularData.pilots.map((x) => {
                        const origPilot = radarStorage.vatsim.data!.pilots.find(y => y.cid === x.cid)!;
                        return {
                            ...x,
                            aircraft_faa: origPilot.flight_plan?.aircraft_faa,
                            departure: origPilot.flight_plan?.departure,
                            arrival: origPilot.flight_plan?.arrival,
                        };
                    }),
                    prefiles: regularData.prefiles.map((x) => {
                        const origPilot = radarStorage.vatsim.data!.prefiles.find(y => y.cid === x.cid)!;
                        return {
                            ...x,
                            aircraft_faa: origPilot.flight_plan?.aircraft_faa,
                            departure: origPilot.flight_plan?.departure,
                            arrival: origPilot.flight_plan?.arrival,
                        };
                    }),
                };
                radarStorage.vatsim.firs = getATCBounds();
                radarStorage.vatsim.locals = getLocalATC();
                radarStorage.vatsim.airports = getAirportsList();
            }
            catch (e) {
                console.error(e);
            }
            finally {
                isInProgress = false;
                latestFinished = Date.now();
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
