import AdmZip from 'adm-zip';
import type { FeatureCollection, Feature, MultiPolygon, Polygon } from 'geojson';
import githubRequest from '~/utils/backend/github';
import { radarStorage } from '~/utils/backend/storage';

export function getDiffPolygons(geojson: FeatureCollection, type: 'simaware' | 'vatspy'): FeatureCollection {
    const dataToCompare = radarStorage.simaware.data;
    if (!dataToCompare) throw new Error('SimAware data is missing');

    const toPush: Feature[] = [];

    for (const feature of geojson.features) {
        const previousFeature = dataToCompare.features.find(x => JSON.stringify(x.properties) === JSON.stringify(feature.properties));

        if (!previousFeature) {
            feature.properties!.fill = 'success500';
        }
        else if (JSON.stringify(previousFeature.geometry) !== JSON.stringify(feature.geometry)) {
            feature.properties!.fill = 'primary500';
            toPush.push({
                ...previousFeature,
                properties: {
                    ...previousFeature.properties,
                    fill: 'info500',
                },
            });
        }
    }
    geojson.features.push(...toPush);

    for (const feature of dataToCompare.features) {
        const previousFeature = geojson.features.find(x => x.properties!.id === feature.properties!.id && x.properties!.name === feature.properties!.name);
        if (!previousFeature) {
            geojson.features.push({
                ...feature,
                properties: {
                    ...feature.properties,
                    fill: 'error500',
                },
            });
        }
    }

    if (type === 'simaware') {
        geojson.features = geojson.features.filter(x => x.properties!.fill);
    }

    return geojson;
}

export async function getSimAwareData(pr: number) {
    const data = await githubRequest<Record<string, any>>(`https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/pulls/${ pr }`);
    const sha = data.head.sha;

    return compileSimAware(await githubRequest<ArrayBuffer, 'arrayBuffer'>(`https://github.com/vatsimnetwork/simaware-tracon-project/archive/${ sha }.zip`, { responseType: 'arrayBuffer' }));
}

export function compileSimAware(file: ArrayBuffer) {
    const zip = new AdmZip(Buffer.from(file));
    const geojson: FeatureCollection<MultiPolygon | Polygon> = {
        type: 'FeatureCollection',
        // @ts-expect-error Dynamic name
        name: Date.now().toString(),
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: [],
    };

    const entries = zip.getEntries();

    for (const entry of entries) {
        if (!entry.entryName.includes('/Boundaries/') || !entry.name.endsWith('.json')) continue;

        let contents = JSON.parse(entry.getData().toString('utf-8'));
        if ('features' in contents) {
            contents = contents.features[0];
        }
        geojson.features.push(contents);
    }

    return geojson;
}
