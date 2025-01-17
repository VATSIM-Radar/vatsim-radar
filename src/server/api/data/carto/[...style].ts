import { getRedisSync, setRedisSync } from '~/utils/backend/redis';
import { handleH3Error } from '~/utils/backend/h3';

export default defineEventHandler(async event => {
    const style = getRouterParam(event, 'style');

    if (!style) {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    const data = await getRedisSync(`carto-${ style }`);

    if (data) {
        setResponseHeader(event, 'Content-Type', 'application/json');
        return data;
    }

    const result = await $fetch<Record<string, any>>(`https://basemaps.cartocdn.com/gl/${ style }/style.json`);
    result.sources.carto.url = '/api/data/carto/tiles';
    result.sprite = result.sprite.replace('https://tiles.basemaps.cartocdn.com/', '/layers/carto/tiles/');
    result.glyphs = result.glyphs.replace('https://tiles.basemaps.cartocdn.com/', '/layers/carto/tiles/');

    await setRedisSync(`carto-${ style }`, JSON.stringify(result), 1000 * 60 * 60 * 24 * 7);

    return result;
});
