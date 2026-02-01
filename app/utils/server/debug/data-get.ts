import AdmZip from 'adm-zip';
import type { Feature, FeatureCollection } from 'geojson';
import githubRequest from '~/utils/server/github';
import type { SimAwareData } from '~/utils/server/storage';
import type { VatSpyData } from '~/types/data/vatspy';
import { compileVatSpy, vatspyDataToGeojson } from '~/utils/server/vatsim/vatspy';

const data = {
    simaware: {
        hash: '',
        data: null as SimAwareData | null,
        branch: 'main',
    },
    vatspy: {
        hash: '',
        data: null as VatSpyData | null,
        branch: 'master',
    },
};

export async function getDiffPolygons(geojson: FeatureCollection, type: 'simaware' | 'vatspy'): Promise<FeatureCollection> {
    if (type === 'simaware') {
        const hash = (await githubRequest(`https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/commits/${ data.simaware.branch }`)).sha;
        if (hash !== data.simaware.hash) {
            data.simaware.data = compileSimAware(await githubRequest<ArrayBuffer, 'arrayBuffer'>(`https://github.com/vatsimnetwork/simaware-tracon-project/archive/refs/heads/${ data.simaware.branch }.zip`, { responseType: 'arrayBuffer' }));
            data.simaware.hash = hash;
        }
    }
    else if (type === 'vatspy') {
        const hash = (await githubRequest(`https://api.github.com/repos/vatsimnetwork/vatspy-data-project/commits/${ data.vatspy.branch }`)).sha;
        if (hash !== data.vatspy.hash) {
            data.vatspy.data = getVatSpyCompiledData(await githubRequest<ArrayBuffer, 'arrayBuffer'>(`https://github.com/vatsimnetwork/vatspy-data-project/archive/refs/heads/${ data.vatspy.branch }.zip`, { responseType: 'arrayBuffer' }));
            data.vatspy.hash = hash;
        }
    }

    const dataToCompare = type === 'simaware'
        ? data.simaware.data!
        : vatspyDataToGeojson(data.vatspy.data!);

    if (!dataToCompare) throw new Error('SimAware data is missing');

    const toPush: Feature[] = [];

    for (const feature of geojson.features) {
        const previousFeature = dataToCompare.features.find(x => type === 'simaware' ? JSON.stringify(x.properties) === JSON.stringify(feature.properties) : x.id === feature.id);

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
        const previousFeature = geojson.features.find(x => type === 'simaware' ? x.properties!.id === feature.properties!.id && x.properties!.name === feature.properties!.name : x.id === feature.id);
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

    return geojson;
}

export async function getVatSpyData(pr: number, receiveOnly: true): Promise<ArrayBuffer>;
export async function getVatSpyData(pr: number, receiveOnly?: false): Promise<VatSpyData>;
export async function getVatSpyData(pr: number, receiveOnly = false) {
    const data = await githubRequest<Record<string, any>>(`https://api.github.com/repos/vatsimnetwork/vatspy-data-project/pulls/${ pr }`);
    const sha = data.head.sha;

    const archive = await githubRequest<ArrayBuffer, 'arrayBuffer'>(`https://github.com/vatsimnetwork/vatspy-data-project/archive/${ sha }.zip`, { responseType: 'arrayBuffer' });
    if (receiveOnly) return archive;

    return getVatSpyCompiledData(archive);
}

export function getVatSpyCompiledData(data: ArrayBuffer, dataOnly: true): [version: string, dat: string, geo: string];
export function getVatSpyCompiledData(data: ArrayBuffer, dataOnly?: false): VatSpyData;
export function getVatSpyCompiledData(data: ArrayBuffer, dataOnly = false) {
    const zip = new AdmZip(Buffer.from(data));

    const entries = zip.getEntries();

    let dat = '';
    let geo = '';

    for (const entry of entries) {
        if (entry.name === 'Boundaries.geojson') geo = entry.getData().toString('utf-8');
        if (entry.name === 'VATSpy.dat') dat = entry.getData().toString('utf-8');
    }

    if (dataOnly) return [Date.now().toString(), dat, geo];

    return compileVatSpy(Date.now().toString(), dat, geo, true);
}

export async function getSimAwareData(pr: number) {
    const data = await githubRequest<Record<string, any>>(`https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/pulls/${ pr }`);
    const sha = data.head.sha;

    const archive = await githubRequest<ArrayBuffer, 'arrayBuffer'>(`https://github.com/vatsimnetwork/simaware-tracon-project/archive/${ sha }.zip`, { responseType: 'arrayBuffer' });

    return compileSimAware(archive);
}

export function compileSimAware(file: ArrayBuffer) {
    const zip = new AdmZip(Buffer.from(file));
    const geojson: SimAwareData = {
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
