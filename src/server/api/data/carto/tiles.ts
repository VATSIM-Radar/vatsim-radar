import { getRedisSync, setRedisSync } from '~/utils/backend/redis';

export default defineEventHandler(async event => {
    const data = await getRedisSync(`carto-tiles`);

    if (data) {
        setResponseHeader(event, 'Content-Type', 'application/json');
        return data;
    }

    const result = await $fetch<Record<string, any>>(`https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json`);
    result.tiles = ['/layers/carto/vector/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt'];

    await setRedisSync(`carto-tiles`, JSON.stringify(result), 1000 * 60 * 60 * 24 * 7);

    return result;
});
