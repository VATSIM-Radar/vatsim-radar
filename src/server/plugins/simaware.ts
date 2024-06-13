import { CronJob } from 'cron';
import type { SimAwareData } from '~/utils/backend/storage';
import { radarStorage } from '~/utils/backend/storage';
import { fromServerLonLat } from '~/utils/backend/vatsim';

const revisions: Record<string, number> = {
    'v1.1.24': 2,
};

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '15 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
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

            if (radarStorage.simaware.version === data.name) return;

            const url = data.assets?.find(x => x.name === 'TRACONBoundaries.geojson')?.browser_download_url;
            if (!url) throw new Error('SimAware asset not found');

            const geojson = await $fetch<SimAwareData>(url, { responseType: 'json' });

            geojson.features = geojson.features.map(x => {
                if ('features' in x) {
                    // @ts-expect-error It is "known" for us
                    x = x.features[0];
                }

                return {
                    ...x,
                    geometry: {
                        ...x.geometry,
                        coordinates: x.geometry.coordinates.map(x => x.map(x => x.map(x => fromServerLonLat(x)))),
                    },
                };
            }).sort((a, b) => {
                if (a.properties!.suffix && !b.properties!.suffix) return -1;
                if (!a.properties!.suffix && b.properties!.suffix) return 1;
                return 0;
            });

            radarStorage.simaware.version = data.name;
            radarStorage.simaware.data = geojson;

            console.info(`SimAware Update Complete (${ data.name })`);
        },
    });
});
