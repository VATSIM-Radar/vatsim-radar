import { radarStorage } from '~/utils/backend/storage';
import type { SimAwareData } from '~/utils/backend/storage';
import { $fetch } from 'ofetch';
import type { RedisData } from '~/utils/backend/redis';
import { setRedisData } from '~/utils/backend/redis';

const revisions: Record<string, number> = {
    'Release v1.1.34': 1,
};

export async function updateSimAware() {
    const data = await $fetch<{
        name: string;
        assets?: {
            name?: string;
            browser_download_url?: string;
        }[];
    }>('https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/releases/latest', {
        timeout: 1000 * 60,
    });

    if (revisions[data.name]) data.name += `-${ revisions[data.name] }`;

    if ((radarStorage.simaware)?.version === data.name) return;

    const url = data.assets?.find(x => x.name === 'TRACONBoundaries.geojson')?.browser_download_url;
    if (!url) throw new Error('SimAware asset not found');

    const geojson = await $fetch<SimAwareData>(url, { responseType: 'json' });

    geojson.features = geojson.features.map(x => {
        if ('features' in x) {
            // @ts-expect-error It is "known" for us
            x = x.features[0];
        }

        return x;
    }).sort((a, b) => {
        if (a.properties!.suffix && !b.properties!.suffix) return -1;
        if (!a.properties!.suffix && b.properties!.suffix) return 1;
        return 0;
    });

    radarStorage.simaware.version = data.name;
    radarStorage.simaware.data = geojson;
    await setRedisData('data-simaware', radarStorage.simaware as RedisData['data-simaware'], 1000 * 60 * 60 * 24 * 2);

    console.info(`SimAware Update Complete (${ data.name })`);
}
