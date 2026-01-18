import type { PartialRecord } from '~/types';
import { ofetch } from 'ofetch';
import type { VatSpyData, VatSpyResponse } from '~/types/data/vatspy';
import { radarStorage } from '~/utils/server/storage';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { MultiPolygon as OlMultiPolygon } from 'ol/geom';
import { getVATSIMIdentHeaders } from '~/utils/server';
import type { RedisData } from '~/utils/server/redis';
import { setRedisData } from '~/utils/server/redis';
import { getLocalText, isDebug } from '~/utils/server/debug';

const revisions: Record<string, number> = {
    'v2506.1': 1,
};

function parseDatFile<S extends Record<string, { title: string; children: Record<string, true> }>>({
    sections,
    dat,
}: {
    sections: S;
    dat: string;
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
        ] of Object.entries(sections) as [string, { title: string; children: Record<string, true> }][]
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
                const section = sections[index]?.split(';')[0]?.trim();
                if (!section) return;
                itemResult[key] = section;
            });

            result[section as keyof S].push(itemResult);
        }
    }

    return result;
}

export function compileVatSpy(version: string, dat: string, geo: string, includeProperties = false) {
    const geojson = JSON.parse(geo) as {
        features: Feature<MultiPolygon>[];
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

    result.id = version;
    result.countries = parsedDat.countries.filter(value => value.country && value.code) as typeof result['countries'];
    result.uirs = parsedDat.uirs.filter(value => value.icao && value.name && value.firs) as typeof result['uirs'];
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S1', boundary: 'BIRD' });
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S2', boundary: 'BIRD' });
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S3', boundary: 'BIRD' });

    result.airports = [];

    result.keyAirports ??= {
        icao: {},
        iata: {},
        realIcao: {},
        realIata: {},
    };

    for (const data of parsedDat.airports) {
        if (!data.icao || !data.name || !data.lat || !data.lon || !data.isPseudo) continue;
        if (data.iata && result.keyAirports.iata[data.iata]) continue;

        const lonlat = [+data.lon!, +data.lat!];
        const airport = {
            ...data as Required<typeof data>,
            lat: lonlat[1],
            lon: lonlat[0],
            isPseudo: data.isPseudo === '1',
        };

        result.keyAirports.icao[airport.icao] = airport;

        if (airport.iata) {
            result.keyAirports.iata[airport.iata] = airport;
        }

        if (!airport.isPseudo) {
            result.keyAirports.realIcao[airport.icao] = airport;

            if (airport.iata) {
                result.keyAirports.realIata[airport.iata] = airport;
            }
        }

        result.airports.push(airport);
    }

    result.firs = [];
    parsedDat.firs
        .filter(value => value.icao && value.name)
        .forEach(value => {
            let boundaries = geojson.features.filter(x => x.properties?.id === value.boundary);
            if (!boundaries.length) boundaries = geojson.features.filter(x => x.properties?.id === value.icao);
            if (!boundaries.length) {
                console.warn(`FIR didn't find it's feature in geojson (${ value.icao }, ${ value.boundary })`);
                return;
            }

            boundaries.forEach((boundary, index) => {
                const rootBoundary = boundaries.find((x, xIndex) => x.id === boundary.id && xIndex < index && x.properties!.oceanic === boundary.properties!.oceanic);
                if (rootBoundary) {
                    rootBoundary.geometry.coordinates = [
                        ...rootBoundary.geometry.coordinates,
                        ...boundary.geometry.coordinates,
                    ];

                    boundaries.splice(index, 1);
                }
            });

            boundaries.forEach((boundary, index) => {
                boundary.geometry.coordinates = boundary.geometry.coordinates.map(x => x.map(x => x.map(x => x.map(x => {
                    if (x === 0) return 0.01;
                    if (x === -180) return -179.9;
                    if (x === 180) return 179.9;
                    return x;
                })))) as any;

                const coordinate = [+boundary.properties!.label_lon, +boundary.properties!.label_lat];

                result.firs.push({
                    ...value as Required<typeof value>,
                    isOceanic: boundary.properties!.oceanic === '1' || !!value.name?.includes('Oceanic'),
                    lon: coordinate[0],
                    lat: coordinate[1],
                    region: boundary.properties!.region,
                    division: boundary.properties!.division,
                    feature: {
                        type: boundary.type,
                        id: boundary.properties!.id + index,
                        geometry: boundary.geometry,
                        properties: includeProperties ? boundary.properties : {},
                    },
                });
            });
        });

    return result;
}

export async function updateVatSpy() {
    const localBoundaries = isDebug() && getLocalText('vatspy.geojson');
    const localDat = isDebug() && getLocalText('vatspy.dat');

    let version: string;
    let dat: string;
    let geo: string;

    if (localBoundaries && localDat) {
        version = Date.now().toString();
        dat = localDat;
        geo = localBoundaries;
    }
    else {
        const data = await ofetch<VatSpyResponse>('https://api.vatsim.net/api/map_data/', {
            timeout: 1000 * 60,
            retry: 3,
            headers: getVATSIMIdentHeaders(),
        });

        if (revisions[data.current_commit_hash]) data.current_commit_hash += `-${ revisions[data.current_commit_hash] }`;
        if ((radarStorage.vatspy)?.version === data.current_commit_hash) {
            await setRedisData('data-vatspy', radarStorage.vatspy as RedisData['data-vatspy'], 1000 * 60 * 60 * 24 * 2);
            return;
        }
        const result = await Promise.all([
            ofetch(data.vatspy_dat_url, { responseType: 'text', timeout: 1000 * 60 }),
            ofetch(data.fir_boundaries_geojson_url, { responseType: 'text', timeout: 1000 * 60 }),
        ]);

        version = data.current_commit_hash;
        dat = result[0];
        geo = result[1];
    }

    radarStorage.vatspy.version = version;
    radarStorage.vatspy.data = compileVatSpy(version, dat, geo);
    await setRedisData('data-vatspy', radarStorage.vatspy as RedisData['data-vatspy'], 1000 * 60 * 60 * 24 * 2);
    console.info(`VatSpy Update Complete (${ radarStorage.vatspy.version })`);
}

let firsPolygons: {
    icao: string;
    featureId: string;
    polygon: OlMultiPolygon;
}[] = [];
let firsVersion = '';

export async function getFirsPolygons() {
    const vatspy = radarStorage.vatspy;
    if (firsVersion !== vatspy!.version) {
        firsPolygons = vatspy!.data!.firs.map(fir => {
            return {
                icao: fir.icao,
                featureId: fir.feature.id as string,
                polygon: new OlMultiPolygon(fir.feature.geometry.coordinates),
            };
        });
        firsVersion = vatspy!.version;
    }

    return firsPolygons;
}

export function vatspyDataToGeojson(data: VatSpyData): FeatureCollection<MultiPolygon | Polygon> {
    const geojson: FeatureCollection<MultiPolygon | Polygon> = {
        type: 'FeatureCollection',
        // @ts-expect-error Dynamic name
        name: 'VATSIM Map',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: [],
    };

    geojson.features.push(...data.firs.map(x => x.feature));

    return geojson;
}
