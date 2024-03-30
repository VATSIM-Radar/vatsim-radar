import type { PartialRecord } from '~/types';
import { ofetch } from 'ofetch';
import { CronJob } from 'cron';
import { radarStorage } from '~/utils/backend/storage';
import type { GenericFeature, GenericMultiPolygonGeometry } from '@yandex/ymaps3-types/common/types/geojson';
import type { LngLat } from '@yandex/ymaps3-types/common/types';
import type { VatSpyData, VatSpyResponse } from '~/types/data/vatspy';

function parseDatFile<S extends Record<string, { title: string, children: Record<string, true> }>>({ sections, dat }: {
    sections: S
    dat: string
}): {
    [K in keyof S]: Array<{
        [L in keyof S[K]['children']]?: string
    }>
} {
    const result = {} as ReturnType<typeof parseDatFile<S>>;

    for (
        const [
            section, {
                title,
                children,
            },
        ] of Object.entries(sections) as [string, { title: string, children: Record<string, true> }][]
    ) {
        const keys = Object.keys(children);
        const items = dat.split(`[${ title }]`)[1]?.split(/\n\s*\n/)[0]?.split('\n');
        if (!items?.length) throw new Error(`No items found for section ${ title }`);

        result[section as keyof S] = [];

        for (let item of items) {
            item = item.trim();
            if (!item || item.startsWith(';')) continue;
            const sections = item.split('|');
            const itemResult = {} as PartialRecord<string, string>;

            keys.forEach((key, index) => {
                const section = sections[index]?.trim();
                if (!section) return;
                itemResult[key] = section;
            });

            result[section as keyof S].push(itemResult);
        }
    }

    return result;
}

export default defineNitroPlugin((app) => {
    CronJob.from({
        cronTime: '0 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
            const data = await ofetch<VatSpyResponse>('https://api.vatsim.net/api/map_data/');
            if (radarStorage.vatspy.version === data.current_commit_hash) return;

            const [dat, geo] = await Promise.all([
                ofetch(data.vatspy_dat_url, { responseType: 'text' }),
                ofetch(data.fir_boundaries_geojson_url, { responseType: 'text' }),
            ]);

            const geojson = JSON.parse(geo) as {
                features: Array<
                    Omit<GenericFeature<LngLat>, 'properties' | 'geometry'> & {
                    properties: Record<string, string>
                    geometry: GenericMultiPolygonGeometry<LngLat>
                }>
            };

            const result = {} as VatSpyData;

            const parsedDat = parseDatFile({
                sections: {
                    countries: {
                        title: 'Countries',
                        children: {
                            country: true,
                            code: true,
                            callsign: true,
                        },
                    },
                    airports: {
                        title: 'Airports',
                        children: {
                            icao: true,
                            name: true,
                            lat: true,
                            lon: true,
                            iata: true,
                            fir: true,
                            isPseudo: true,
                        },
                    },
                    firs: {
                        title: 'FIRs',
                        children: {
                            icao: true,
                            name: true,
                            callsign: true,
                            boundary: true,
                        },
                    },
                    uirs: {
                        title: 'UIRs',
                        children: {
                            icao: true,
                            name: true,
                            firs: true,
                        },
                    },
                },
                dat,
            });

            result.id = data.current_commit_hash;
            result.countries = parsedDat.countries.filter(value => value.country && value.code) as typeof result['countries'];
            result.uirs = parsedDat.uirs.filter(value => value.icao && value.name && value.firs) as typeof result['uirs'];

            result.airports = parsedDat.airports
                .filter(value => value.icao && value.name && value.lat && value.lon && value.isPseudo)
                .map(value => ({
                    ...value as Required<typeof value>,
                    lat: +value.lat!,
                    lon: +value.lon!,
                    isPseudo: value.isPseudo === '1',
                }));

            result.firs = [];
            parsedDat.firs
                .filter(value => value.icao && value.name)
                .forEach((value) => {
                    const boundaries = geojson.features.filter(x => x.properties?.id === (value.boundary || value.icao));
                    if (!boundaries.length) throw new Error(`FIR didn't find it's feature in geojson (${ value.icao })`);

                    boundaries.forEach((boundary, index) => {
                        boundary.geometry.coordinates = boundary.geometry.coordinates.map(x => x.map(x => x.map(x => x.map((x) => {
                            if (x === 0) return 0.01;
                            if (x === -180) return -179.9;
                            if (x === 180) return 179.9;
                            return x;
                        })))) as any;

                        result.firs.push({
                            ...value as Required<typeof value>,
                            isOceanic: boundary.properties.oceanic === '1',
                            lon: +boundary.properties.label_lon,
                            lat: +boundary.properties.label_lat,
                            region: boundary.properties.region,
                            division: boundary.properties.division,
                            feature: {
                                type: boundary.type,
                                id: boundary.properties.id + index,
                                geometry: boundary.geometry,
                            },
                        });
                    });
                });

            radarStorage.vatspy.version = data.current_commit_hash;
            radarStorage.vatspy.data = result;
            console.info(`VatSpy Update Complete (${ radarStorage.vatspy.version })`);
        },
    });
});
