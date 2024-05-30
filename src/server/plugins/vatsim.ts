import { CronJob } from 'cron';
import { ofetch } from 'ofetch';
import type { VatsimData, VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { getAirportsList, getATCBounds, getLocalATC, useFacilitiesIds } from '~/utils/data/vatsim';
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

export default defineNitroPlugin(app => {
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
                const data = await ofetch<VatsimData>('https://data.vatsim.net/v3/vatsim-data.json', {
                    parseResponse(responseText) {
                        return JSON.parse(responseText);
                    },
                });

                if (radarStorage.vatsim.data?.general) {
                    if (new Date(radarStorage.vatsim.data.general.update_timestamp).getTime() >= new Date(data.general.update_timestamp).getTime()) return;
                }

                data.pilots = data.pilots.map(x => {
                    const coords = fromServerLonLat([x.longitude, x.latitude]);

                    return {
                        ...x,
                        longitude: coords[0],
                        latitude: coords[1],
                    };
                }).filter((x, index) => !data.pilots.some((y, yIndex) => y.cid === x.cid && yIndex < index));

                data.general.supsCount = data.controllers.filter(x => x.rating === 11 && x.frequency === '199.998').length;
                data.general.admCount = data.controllers.filter(x => x.rating === 12 && x.frequency === '199.998').length;

                /* data.controllers.push({
                    callsign: 'CHI_X_APP',
                    cid: 3,
                    facility: (await import('~/utils/data/vatsim')).useFacilitiesIds().APP,
                    frequency: '122.122',
                    last_updated: '',
                    logon_time: '',
                    name: '',
                    rating: 0,
                    server: '',
                    text_atis: ['undefined'],
                    visual_range: 0,
                });*/

                data.prefiles = data.prefiles.filter((x, index) => !data.pilots.some(y => x.cid === y.cid) && !data.prefiles.some((y, yIndex) => y.cid === x.cid && yIndex > index));

                radarStorage.vatsim.data = data;

                const positions = useFacilitiesIds();

                data.controllers = data.controllers.filter(controller => {
                    if (controller.facility === positions.OBS) return;
                    const postfix = controller.callsign.split('_').slice(-1)[0];
                    controller.facility = positions[postfix as keyof typeof positions] ?? -1;
                    return controller.facility !== -1 && controller.facility !== positions.OBS;
                });

                const regularData = excludeKeys(radarStorage.vatsim.data, {
                    pilots: {
                        server: true,
                        transponder: true,
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
                    pilots: regularData.pilots.map(x => {
                        const origPilot = radarStorage.vatsim.data!.pilots.find(y => y.cid === x.cid)!;
                        return {
                            ...x,
                            aircraft_short: origPilot.flight_plan?.aircraft_short,
                            aircraft_faa: origPilot.flight_plan?.aircraft_faa,
                            departure: origPilot.flight_plan?.departure,
                            arrival: origPilot.flight_plan?.arrival,
                        };
                    }),
                    prefiles: regularData.prefiles.map(x => {
                        const origPilot = radarStorage.vatsim.data!.prefiles.find(y => y.cid === x.cid)!;
                        return {
                            ...x,
                            aircraft_short: origPilot.flight_plan?.aircraft_short,
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
            radarStorage.vatsim.events = (await $fetch<{ data: VatsimEvent[] }>('https://my.vatsim.net/api/v2/events/latest')).data;
        },
    });
});
