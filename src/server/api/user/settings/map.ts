import type { UserSettings } from '~/utils/backend/user';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import type { PartialRecord } from '~/types';
import type { MapAircraftStatus } from '~/composables/pilots';
import { isObject } from '~/utils/shared';
import { colorsList } from '~/utils/backend/styles';
import { prisma } from '~/utils/backend/prisma';

const visibilityKeys: Array<keyof UserMapSettingsVisibilityATC> = ['firs', 'approach', 'ground'];
const groundHideKeys: Array<IUserMapSettings['groundTraffic']['hide']> = ['always', 'lowZoom', 'never'];
const airportsModeKeys: Array<IUserMapSettings['airportsMode']> = ['staffedOnly', 'staffedAndGroundTraffic', 'all'];
const counterModeKeys: Array<IUserMapSettings['airportsCounters']['arrivalsMode']> = ['total', 'totalMoving', 'ground', 'airborne', 'hide'];

const colors = Object.keys(colorsList);

// I wrote this myself and very proud tbh
const hexColorRegex = /^((#(\d{3}|\d{6}))|(rgb(a?)\(\d{1,3},( ?)\d{1,3},( ?)\d{1,3}(\)|,( ?)[0-9.]{1,4}\))))$/;

function validateColor(color: unknown) {
    return typeof color === 'string' && (
        hexColorRegex.test(color) ||
        colors.includes(color)
    );
}

const statuses = Object.keys({
    default: true,
    green: true,
    active: true,
    hover: true,
    neutral: true,
    arriving: true,
    departing: true,
    landed: true,
} satisfies Record<MapAircraftStatus, true>);

function validateTheme(val: unknown): boolean {
    if (!isObject(val)) return false;

    if ('firs' in val && !validateColor(val.firs)) return false;
    if ('uirs' in val && !validateColor(val.uirs)) return false;
    if ('approach' in val && !validateColor(val.approach)) return false;

    if ('aircraft' in val) {
        if (!isObject(val.aircraft)) return false;

        for (const [key, value] of Object.entries(val.aircraft)) {
            if (key !== 'main' && !statuses.includes(key)) return false;

            if (!validateColor(value)) return false;
        }
    }

    return true;
}

function validateRandomObjectKeys(object: Record<string, unknown>, allowedKeys: string[]) {
    for (const key in object) {
        if (!allowedKeys.includes(key)) return false;
    }
}

const validators: Record<keyof IUserMapSettings, (val: unknown) => boolean> = {
    visibility: val => {
        if (!isObject(val)) return false;

        if ('atc' in val) {
            if (typeof val.atc !== 'boolean' && !isObject(val.atc)) return false;

            if (isObject(val.atc) && !Object.entries(val.atc).every(([key, value]) => visibilityKeys.includes(key as any) && typeof value === 'boolean')) return false;
        }

        if ('atcLabels' in val && typeof val.pilots !== 'boolean') return false;
        if ('airports' in val && typeof val.pilots !== 'boolean') return false;
        if ('pilots' in val && typeof val.pilots !== 'boolean') return false;
        if ('gates' in val && typeof val.gates !== 'boolean') return false;
        if ('runways' in val && typeof val.runways !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['atc', 'atcLabels', 'airports', 'pilots', 'gates', 'runways'])) return false;

        return true;
    },
    heatmapLayer: val => {
        return typeof val === 'boolean';
    },
    groundTraffic: val => {
        if (!isObject(val)) return false;

        if ('hide' in val && (typeof val.hide !== 'string' || !groundHideKeys.includes(val.hide as any))) return false;
        if ('excludeMyArrival' in val && typeof val.excludeMyArrival !== 'boolean') return false;
        if ('excludeMyLocation' in val && typeof val.excludeMyArrival !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['hide', 'excludeMyArrival', 'excludeMyLocation'])) return false;

        return true;
    },
    aircraftScale: val => {
        return typeof val === 'boolean';
    },
    airportsMode: val => {
        return typeof val === 'string' && airportsModeKeys.includes(val as any);
    },
    airportsCounters: val => {
        if (!isObject(val)) return false;

        if ('showSameAirportCounter' in val && typeof val.showSameAirportCounter !== 'boolean') return false;
        if ('departuresMode' in val && (typeof val.departuresMode !== 'string' || !counterModeKeys.includes(val.departuresMode as any))) return false;
        if ('arrivalsMode' in val && (typeof val.departuresMode !== 'string' || !counterModeKeys.includes(val.departuresMode as any))) return false;

        if (!validateRandomObjectKeys(val, ['showSameAirportCounter', 'departuresMode', 'arrivalsMode'])) return false;

        return true;
    },
    colors: val => {
        if (!isObject(val)) return false;

        // TODO
        if ('turns' in val) return false;

        if (!validateRandomObjectKeys(val, ['turns', 'light', 'default'])) return false;

        if ('default' in val && !validateTheme(val.default)) return false;
        if ('light' in val && !validateTheme(val.light)) return false;

        return true;
    },
};

export interface UserMapSettingsColors {
    firs?: string;
    uirs?: string;
    approach?: string;
    aircraft?: PartialRecord<MapAircraftStatus, string> & {
        main?: string;
    };
}

export interface UserMapSettingsVisibilityATC {
    firs: boolean;
    approach: boolean;
    ground: boolean;
}

export interface IUserMapSettings {
    visibility: {
        atc?: Partial<UserMapSettingsVisibilityATC> | boolean;
        atcLabels?: boolean;
        airports?: boolean;
        pilots?: boolean;
        gates?: boolean;
        runways?: boolean;
    };
    heatmapLayer: boolean;
    groundTraffic: {
        hide?: 'always' | 'lowZoom' | 'never';
        excludeMyArrival?: boolean;
        excludeMyLocation?: boolean;
    };
    aircraftScale: number;
    airportsMode: 'staffedOnly' | 'staffedAndGroundTraffic' | 'all';
    airportsCounters: {
        showSameAirportCounter?: boolean;
        departuresMode?: 'total' | 'totalMoving' | 'airborne' | 'ground' | 'groundMoving' | 'hide';
        arrivalsMode?: IUserMapSettings['airportsCounters']['departuresMode'];
        hidePrefiles?: boolean;
        disableTraining?: boolean;
    };
    colors: {
        light?: UserMapSettingsColors;
        default?: UserMapSettingsColors;
        turns?: string;
    };
}

export type UserMapSettings = Partial<IUserMapSettings>;

export default defineEventHandler(async event => {
    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        const settings = (await prisma.user.findFirst({
            select: {
                mapSettings: true,
            },
            where: {
                id: user.id,
            },
        }))!.mapSettings ?? {} as UserMapSettings;

        if (event.method === 'POST') {
            const body = await readBody<UserSettings>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'You must pass body to this route',
                });
            }

            for (const [key, value] of Object.entries(body) as [keyof IUserMapSettings, unknown][]) {
                if (!(key in validators)) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        statusMessage: `Invalid key given: ${ key }`,
                    });
                }

                if (!validators[key](value)) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        statusMessage: `${ key } validation has failed`,
                    });
                }
            }

            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    settings: JSON.stringify(body),
                },
            });
        }
        else if (event.method === 'GET') {
            return settings;
        }
        else {
            return handleH3Error({
                event,
                statusCode: 400,
                statusMessage: 'Incorrect method received',
            });
        }
    }
    catch (e) {
        return handleH3Exception(event, e);
    }

    return {
        status: 'ok',
    };
});
