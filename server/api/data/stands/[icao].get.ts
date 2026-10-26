import { getCommunityAirportStands } from '~/utils/server/stands';

export default defineEventHandler(async event => {
    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    if (!icao || !/^[A-Z]{4}$/.test(icao)) throw createError({ statusCode: 400, message: 'Invalid airport code' });
    try {
        const data = await getCommunityAirportStands(icao);
        setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
        return data;
    }
    catch {
        throw createError({ statusCode: 503, message: 'Community stand data temporarily unavailable' });
    }
});
