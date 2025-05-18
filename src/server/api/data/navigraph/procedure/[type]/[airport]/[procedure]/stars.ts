import { radarStorage } from '~/utils/backend/storage';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export default defineEventHandler(async event => {
    const { airport, procedure } = getRouterParams(event);

    return radarStorage.navigraphData.full.current?.stars[airport];
});
