import type { Sigmets } from '~/utils/backend/storage';
import { handleH3Error } from '~/utils/backend/h3';
import { getRedisSync, setRedisSync } from '~/utils/backend/redis';
import { addLeadingZero } from '~/utils/shared';


export default defineEventHandler(async event => {
    let date = getQuery(event).date;

    if (date && (typeof date !== 'string' || isNaN(new Date(date) as unknown as number))) {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    if (date && new Date(date as string).getTime() < Date.now()) date = undefined;

    const key = `sigmet-${ date as string || 'current' }`;
    const cachedResult = import.meta.dev ? null : await getRedisSync(key);
    if (cachedResult) {
        try {
            return JSON.parse(cachedResult);
        }
        catch { /* empty */ }
    }

    const requestDate = date ? new Date(date as string) : null;
    const requestParam = requestDate && `${ requestDate.getUTCFullYear() }${ addLeadingZero(requestDate.getUTCMonth() + 1) }${ addLeadingZero(requestDate.getUTCDate()) }${ addLeadingZero(requestDate.getUTCHours()) }${ addLeadingZero(requestDate.getUTCMinutes()) }`;

    const isigmet = $fetch<Sigmets<{
        icaoId: string;
        firId: string;
        firName: string;
        seriesId: string;
        hazard: string | null;
        qualifier: string;
        validTimeFrom: string;
        validTimeTo: string;
        rawSigmet?: string;
        base?: number;
        top?: number;
        dir?: string;
        spd?: number;
        chng?: string;
    }>>(`https://aviationweather.gov/api/data/isigmet?format=geojson${ requestParam ? `&date=${ requestParam }` : '' }`);
    const airsigmet = $fetch<Sigmets<{
        icaoId: string;
        airSigmetType: string;
        alphaChar: string;
        hazard: string | null;
        validTimeFrom: string;
        validTimeTo: string;
        severity: number;
        rawAirSigmet: string;
    }>>(`https://aviationweather.gov/api/data/airsigmet?format=geojson${ requestParam ? `&date=${ requestParam }` : '' }`);
    const airmet = $fetch<Sigmets<{
        region: string;
        reg_name: string;
        airmetType: string;
        hazard: string;
        validTimeFrom: string;
        validTimeTo: string;
        severity: unknown | null;
        rawAirmet: string;
    }>>(`https://aviationweather.gov/api/json/AirmetJSON${ requestParam ? `?date=${ requestParam }` : '' }`);
    const gairmet = $fetch<Sigmets<{
        product: string;
        hazard: string | null;
        issueTime: string;
        validTime: string;
        receiptTime: string;
        forecast: number;
        severity?: string;
        top?: string;
        base?: string;
        level?: string;
        dueTo?: string;
    }>>(`https://aviationweather.gov/api/data/gairmet?format=geojson&${ requestParam ? `&date=${ requestParam }` : '' }`);

    const sigmets: Sigmets = {
        type: 'FeatureCollection',
        features: [],
        validUntil: 0,
    };

    for (const feature of (await isigmet).features) {
        const properties = feature.properties;

        sigmets.features.push({
            ...feature,
            properties: {
                id: properties.icaoId,
                region: properties.firId,
                regionName: properties.firName,
                type: properties.seriesId,
                hazard: properties.hazard,
                qualifier: properties.qualifier,
                timeFrom: properties.validTimeFrom,
                timeTo: properties.validTimeTo,
                raw: properties.rawSigmet,
                base: properties.base,
                top: properties.top,
                dir: properties.dir,
                spd: properties.spd,
                change: properties.chng,
                dataType: 'sigmet',
            },
        });
    }

    for (const feature of (await airsigmet).features) {
        const properties = feature.properties;

        if (properties.hazard !== 'CONVECTIVE') {
            sigmets.features.push({
                ...feature,
                properties: {
                    id: properties.icaoId,
                    type: properties.airSigmetType,
                    alphaChar: properties.alphaChar,
                    hazard: properties.hazard,
                    timeFrom: properties.validTimeFrom,
                    timeTo: properties.validTimeTo,
                    qualifier: properties.severity,
                    raw: properties.rawAirSigmet,
                    dataType: 'airsigmet',
                },
            });
        }
    }

    for (const feature of (await airmet).features) {
        const properties = feature.properties;

        sigmets.features.push({
            ...feature,
            properties: {
                region: properties.region,
                regionName: properties.reg_name,
                type: properties.airmetType,
                hazard: properties.hazard,
                timeFrom: properties.validTimeFrom,
                timeTo: properties.validTimeTo,
                raw: properties.rawAirmet,
                dataType: 'airmet',
            },
        });
    }

    for (const feature of (await gairmet).features) {
        const properties = feature.properties;

        const basePropety = properties.base ?? properties.level;
        const base = basePropety ? Number(basePropety) : null;
        const top = properties.top ? Number(properties.top) : null;

        sigmets.features.push({
            ...feature,
            properties: {
                type: properties.product,
                hazard: properties.hazard,
                timeFrom: properties.issueTime,
                timeTo: properties.validTime,
                raw: properties.dueTo,
                dataType: 'airmet',
                base: (typeof base === 'number' && !isNaN(base)) ? base : basePropety,
                top: (typeof top === 'number' && !isNaN(top)) ? top : properties.top,
            },
        });
    }

    const validUntil = requestDate?.getTime() ? (requestDate.getTime() - Date.now()) : 1000 * 60 * 60;
    sigmets.validUntil = validUntil;

    await setRedisSync(key, JSON.stringify(sigmets), validUntil);

    return sigmets;
});
