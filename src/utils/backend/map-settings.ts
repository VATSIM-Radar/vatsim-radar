import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';
import { colorsList } from '~/utils/backend/styles';
import { hexColorRegex, isObject } from '~/utils/shared';
import type { MapAircraftStatus } from '~/composables/pilots';
import type { PartialRecord } from '~/types';
import { UserPresetType } from '@prisma/client';
import type { UserPreset } from '@prisma/client';

const visibilityKeys: Array<keyof UserMapSettingsVisibilityATC> = ['firs', 'approach', 'ground'];
const groundHideKeys: Array<IUserMapSettings['groundTraffic']['hide']> = ['always', 'lowZoom', 'never'];
const airportsModeKeys: Array<IUserMapSettings['airportsMode']> = ['staffedOnly', 'staffedAndGroundTraffic', 'all'];
const counterModeKeys: Array<IUserMapSettings['airportsCounters']['arrivalsMode']> = ['total', 'totalMoving', 'ground', 'groundMoving', 'airborne', 'hide'];

const colors = Object.keys(colorsList);

function validateColor(color: unknown) {
    if (!isObject(color)) return false;

    if (typeof color.color !== 'string' || (!hexColorRegex.test(color.color) && !colors.includes(color.color))) return false;

    if ('transparency' in color) {
        if (typeof color.transparency !== 'number' || color.transparency > 1 || color.transparency < 0) return false;
        color.transparency = Number(color.transparency.toFixed(2));
    }
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
    if ('gates' in val && !validateColor(val.gates)) return false;
    if ('runways' in val && !validateColor(val.runways)) return false;

    if ('aircraft' in val) {
        if (!isObject(val.aircraft)) return false;

        for (const [key, value] of Object.entries(val.aircraft)) {
            if (key !== 'main' && !statuses.includes(key) && key !== 'default') return false;

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

export interface UserMapSettingsColor {
    color: string;
    transparency?: number;
}

export interface UserMapSettingsColors {
    firs?: UserMapSettingsColor;
    uirs?: UserMapSettingsColor;
    approach?: UserMapSettingsColor;
    aircraft?: PartialRecord<MapAircraftStatus, UserMapSettingsColor> & {
        main?: UserMapSettingsColor;
    };
    runways?: UserMapSettingsColor;
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
        popularAirportRings?: boolean;
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
        syncDeparturesArrivals?: boolean;
        departuresMode?: 'total' | 'totalMoving' | 'airborne' | 'ground' | 'groundMoving' | 'hide';
        arrivalsMode?: IUserMapSettings['airportsCounters']['departuresMode'];
        horizontalCounter?: 'total' | 'prefiles' | 'ground' | 'groundMoving' | 'hide';
        disableTraining?: boolean;
    };
    colors: {
        light?: UserMapSettingsColors;
        default?: UserMapSettingsColors;
        turns?: string;
    };
}

export type UserMapSettings = Partial<IUserMapSettings>;

export async function handleMapSettingsEvent(event: H3Event) {
    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        const id = getRouterParam(event, 'id');

        if (id && event.method !== 'GET' && event.method !== 'PUT') {
            return handleH3Error({
                event,
                statusCode: 400,
                statusMessage: 'Only PUT and GET are allowed when using id',
            });
        }
        else if (!id && event.method !== 'POST') {
            return handleH3Error({
                event,
                statusCode: 400,
                statusMessage: 'Only POST is allowed when not using id',
            });
        }

        let settings: UserPreset | null = null;

        if (id) {
            settings = await prisma.userPreset.findFirst({
                where: {
                    id: +id,
                    userId: user.id,
                    type: UserPresetType.MAP_SETTINGS,
                },
            }) ?? null;

            if (!settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'This preset was not found for your user ID',
                });
            }
        }

        if (event.method === 'POST' || event.method === 'PUT') {
            const body = await readBody<Partial<UserPreset>>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'You must pass body to this route',
                });
            }

            if (!body.name && !settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'Name is required when creating settings',
                });
            }

            if (!body.json && !settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'Json is required when creating settings',
                });
            }

            if (body.json) {
                for (const [key, value] of Object.entries(body.json) as [keyof IUserMapSettings, unknown][]) {
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
            }

            if (body.name && body.name.length > 20) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: 'Name validation failed',
                });
            }

            if (settings) {
                await prisma.userPreset.update({
                    where: {
                        id: settings.id,
                    },
                    data: {
                        name: body.name ?? settings.name,
                        json: (body.json ?? settings.json) as Record<string, any>,
                    },
                });
            }
            else {
                await prisma.userPreset.create({
                    data: {
                        userId: user.id,
                        type: UserPresetType.MAP_SETTINGS,
                        name: body.name as string,
                        json: body.json as Record<string, any>,
                    },
                });
            }
        }
        else if (event.method === 'GET') {
            if (id) {
                return settings;
            }
            else {
                return prisma.userPreset.findMany({
                    where: {
                        userId: user.id,
                        type: UserPresetType.MAP_SETTINGS,
                    },
                });
            }
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
}
