import type { PartialRecord } from '~/types';
import { ofetch } from 'ofetch';
import type { VatSpyData, VatSpyResponse } from '~/types/data/vatspy';
import { radarStorage } from '~/utils/backend/storage';
import type { Feature, MultiPolygon } from 'geojson';
import { MultiPolygon as OlMultiPolygon } from 'ol/geom';
import { fromServerLonLat } from '~/utils/backend/vatsim/index';

const revisions: Record<string, number> = {
    'v2408.2': 2,
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

export async function updateVatSpy() {
    const data = await ofetch<VatSpyResponse>('https://api.vatsim.net/api/map_data/', {
        timeout: 1000 * 60,
    });
    if (revisions[data.current_commit_hash]) data.current_commit_hash += `-${ revisions[data.current_commit_hash] }`;
    if (radarStorage.vatspy.version === data.current_commit_hash) return;

    const [dat, geo] = await Promise.all([
        ofetch(data.vatspy_dat_url, { responseType: 'text', timeout: 1000 * 60 }),
        ofetch(data.fir_boundaries_geojson_url, { responseType: 'text', timeout: 1000 * 60 }),
    ]);

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

    result.id = data.current_commit_hash;
    result.countries = parsedDat.countries.filter(value => value.country && value.code) as typeof result['countries'];
    result.uirs = parsedDat.uirs.filter(value => value.icao && value.name && value.firs) as typeof result['uirs'];
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S1', boundary: 'BIRD' });
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S2', boundary: 'BIRD' });
    parsedDat.firs.push({ icao: 'BIRD', name: 'Reykjavik', callsign: 'BIRD_S3', boundary: 'BIRD' });

    result.airports = parsedDat.airports
        .filter(value => value.icao && value.name && value.lat && value.lon && value.isPseudo)
        .map((value, index) => {
            const duplicateIata = parsedDat.airports.find((x, xIndex) => value.iata && x.iata === value.iata && xIndex !== index);
            if (duplicateIata) {
                delete value.iata;
                delete duplicateIata.iata;
            }

            const lonlat = fromServerLonLat([+value.lon!, +value.lat!]);

            return {
                ...value as Required<typeof value>,
                lat: lonlat[1],
                lon: lonlat[0],
                isPseudo: value.isPseudo === '1',
            };
        });

    // @ts-expect-error First init
    result.keyAirports ??= {};
    result.keyAirports.icao = Object.fromEntries(result.airports.map(airport => [airport.icao, airport]));
    result.keyAirports.iata = Object.fromEntries(result.airports.filter(x => x.iata).map(airport => [airport.iata, airport]));
    result.keyAirports.realIcao = Object.fromEntries(result.airports.filter(x => !x.isPseudo).map(airport => [airport.icao, airport]));
    result.keyAirports.realIata = Object.fromEntries(result.airports.filter(x => x.iata && !x.isPseudo).map(airport => [airport.iata, airport]));

    result.firs = [];
    parsedDat.firs
        .filter(value => value.icao && value.name)
        .forEach(value => {
            let boundaries = geojson.features.filter(x => x.properties?.id === value.icao);
            if (!boundaries.length) boundaries = geojson.features.filter(x => x.properties?.id === value.boundary);
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

                const coordinate = fromServerLonLat([+boundary.properties!.label_lon, +boundary.properties!.label_lat]);

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
                        properties: {},
                    },
                });
            });
        });

    radarStorage.vatspy.version = data.current_commit_hash;
    radarStorage.vatspy.data = result;
    console.info(`VatSpy Update Complete (${ radarStorage.vatspy.version })`);
}

let firsPolygons: {
    icao: string;
    featureId: string;
    polygon: OlMultiPolygon;
}[] = [];
let firsVersion = '';

export function getFirsPolygons() {
    if (firsVersion !== radarStorage.vatspy.version) {
        firsPolygons = radarStorage.vatspy.data!.firs.map(fir => {
            return {
                icao: fir.icao,
                featureId: fir.feature.id as string,
                polygon: new OlMultiPolygon(fir.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromServerLonLat(x))))),
            };
        });
        firsVersion = radarStorage.vatspy.version;
    }

    return firsPolygons;
}
