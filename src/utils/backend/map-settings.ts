import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/backend/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';
import { colorsList } from '~/utils/backend/styles';
import { hexColorRegex, isObject, MAX_MAP_PRESETS } from '~/utils/shared';
import type { MapAircraftStatus } from '~/composables/pilots';
import type { PartialRecord } from '~/types';
import { UserPresetType } from '@prisma/client';
import type { UserPreset } from '@prisma/client';

const visibilityKeys: Array<keyof UserMapSettingsVisibilityATC> = ['firs', 'approach', 'ground'];
const groundHideKeys: Array<IUserMapSettings['groundTraffic']['hide']> = ['always', 'lowZoom', 'never'];
const airportsModeKeys: Array<IUserMapSettings['airportsMode']> = ['staffedOnly', 'staffedAndGroundTraffic', 'all'];
const counterModeKeys: Array<IUserMapSettings['airportsCounters']['arrivalsMode']> = ['total', 'totalMoving', 'ground', 'groundMoving', 'airborne', 'hide'];
const prefilesModeKeys: Array<IUserMapSettings['airportsCounters']['horizontalCounter']> = ['total', 'prefiles', 'ground', 'groundMoving', 'hide'];
const turnsKeys: Array<IUserMapSettings['colors']['turns']> = ['magma', 'inferno', 'rainbow', 'viridis'];
const tracksKeys: Array<IUserMapSettings['tracks']['mode']> = ['arrivalsOnly', 'arrivalsAndLanded', 'departures', 'ground', 'allAirborne', 'all'];
const navigraphKeys: Array<keyof IUserMapSettings['navigraphLayers']> = ['disable', 'gatesFallback', 'hideTaxiways', 'hideGateGuidance', 'hideRunwayExit', 'hideDeicing'];

const colors = Object.keys(colorsList);

function validateTransparency(transparency: unknown) {
    if (typeof transparency !== 'number' || transparency > 1 || transparency < 0) return false;
    return Number(transparency.toFixed(2));
}

function validateColor(color: unknown): boolean {
    if (!isObject(color)) return false;

    if (typeof color.color !== 'string' || (!hexColorRegex.test(color.color) && !colors.includes(color.color))) return false;

    if ('transparency' in color) {
        const transparency = validateTransparency(color.transparency);
        if (transparency !== false) color.transparency = transparency;
        else return false;
    }

    return true;
}

const statuses = Object.keys({
    default: true,
    ground: true,
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
    if ('centerText' in val && !validateColor(val.centerText)) return false;
    if ('centerBg' in val && !validateColor(val.centerBg)) return false;
    if ('approach' in val && !validateColor(val.approach)) return false;
    if ('staffedAirport' in val) {
        const transparency = validateTransparency(val.staffedAirport);
        if (transparency !== false) val.staffedAirport = transparency;
        else return false;
    }
    if ('defaultAirport' in val) {
        const transparency = validateTransparency(val.defaultAirport);
        if (transparency !== false) val.defaultAirport = transparency;
        else return false;
    }
    if ('gates' in val) {
        const transparency = validateTransparency(val.gates);
        if (transparency !== false) val.gates = transparency;
        else return false;
    }
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

function validateRandomObjectKeys(object: Record<string, unknown>, allowedKeys: string[]): boolean {
    for (const key in object) {
        if (!allowedKeys.includes(key)) return false;
    }

    return true;
}

const validators: Record<keyof IUserMapSettings, (val: unknown) => boolean> = {
    visibility: val => {
        if (!isObject(val)) return false;

        if ('atc' in val) {
            if (typeof val.atc !== 'boolean' && !isObject(val.atc)) return false;

            if (isObject(val.atc) && !Object.entries(val.atc).every(([key, value]) => visibilityKeys.includes(key as any) && typeof value === 'boolean')) return false;
        }

        if ('atcLabels' in val && typeof val.atcLabels !== 'boolean') return false;
        if ('airports' in val && typeof val.airports !== 'boolean') return false;
        if ('pilots' in val && typeof val.pilots !== 'boolean') return false;
        if ('gates' in val && typeof val.gates !== 'boolean') return false;
        if ('runways' in val && typeof val.runways !== 'boolean') return false;
        if ('pilotsInfo' in val && typeof val.pilotsInfo !== 'boolean') return false;
        if ('atcInfo' in val && typeof val.atcInfo !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['atc', 'atcLabels', 'airports', 'pilots', 'gates', 'runways', 'pilotsInfo', 'atcInfo'])) return false;

        return true;
    },
    heatmapLayer: val => {
        return typeof val === 'boolean';
    },
    highlightEmergency: val => {
        return typeof val === 'boolean';
    },
    vatglasses: val => {
        if (!isObject(val)) return false;

        if ('active' in val && typeof val.active !== 'boolean') return false;
        if ('autoEnable' in val && typeof val.autoEnable !== 'boolean') return false;
        if ('combined' in val && typeof val.combined !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['active', 'combined', 'autoEnable'])) return false;

        return true;
    },
    groundTraffic: val => {
        if (!isObject(val)) return false;

        if ('hide' in val && (typeof val.hide !== 'string' || !groundHideKeys.includes(val.hide as any))) return false;
        if ('excludeMyArrival' in val && typeof val.excludeMyArrival !== 'boolean') return false;
        if ('excludeMyLocation' in val && typeof val.excludeMyLocation !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['hide', 'excludeMyArrival', 'excludeMyLocation'])) return false;

        return true;
    },
    navigraphLayers: val => {
        if (!isObject(val)) return false;

        if (!validateRandomObjectKeys(val, navigraphKeys)) return false;

        if (!Object.values(val).every(x => typeof x === 'boolean')) return false;

        return true;
    },
    aircraftScale: val => {
        return typeof val === 'number' && val > 0 && val < 5;
    },
    airportsMode: val => {
        return typeof val === 'string' && airportsModeKeys.includes(val as any);
    },
    airportsCounters: val => {
        if (!isObject(val)) return false;

        if ('syncDeparturesArrivals' in val && typeof val.syncDeparturesArrivals !== 'boolean') return false;
        if ('disableTraining' in val && typeof val.disableTraining !== 'boolean') return false;
        if ('syncWithOverlay' in val && typeof val.syncWithOverlay !== 'boolean') return false;
        if ('departuresMode' in val && (typeof val.departuresMode !== 'string' || !counterModeKeys.includes(val.departuresMode as any))) return false;
        if ('horizontalCounter' in val && (typeof val.horizontalCounter !== 'string' || !prefilesModeKeys.includes(val.horizontalCounter as any))) return false;
        if ('arrivalsMode' in val && (typeof val.arrivalsMode !== 'string' || !counterModeKeys.includes(val.arrivalsMode as any))) return false;

        if (!validateRandomObjectKeys(val, ['syncDeparturesArrivals', 'disableTraining', 'syncWithOverlay', 'departuresMode', 'arrivalsMode', 'horizontalCounter'])) return false;

        return true;
    },
    colors: val => {
        if (!isObject(val)) return false;

        if ('turns' in val && (typeof val.turns !== 'string' || !turnsKeys.includes(val.turns as any))) return false;

        if ('turnsTransparency' in val) {
            const transparency = validateTransparency(val.turnsTransparency);
            if (transparency !== false) val.turnsTransparency = transparency;
            else return false;
        }

        if (!validateRandomObjectKeys(val, ['turns', 'turnsTransparency', 'light', 'default'])) return false;

        if ('default' in val && !validateTheme(val.default)) return false;
        if ('light' in val && !validateTheme(val.light)) return false;

        return true;
    },
    hideATISOnly: val => {
        return typeof val === 'boolean';
    },
    tracks: val => {
        if (!isObject(val)) return false;
        if (!validateRandomObjectKeys(val, ['mode', 'showOutOfBounds'])) return false;

        if ('mode' in val && (typeof val.mode !== 'string' || !tracksKeys.includes(val.mode as any))) return false;
        if ('showOutOfBounds' in val && typeof val.showOutOfBounds !== 'boolean') return false;
        if ('limit' in val && (typeof val.limit !== 'number' || isNaN(val.limit) || val.limit < 1 || val.limit > 50)) return false;

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
    centerText?: UserMapSettingsColor;
    centerBg?: UserMapSettingsColor;
    approach?: UserMapSettingsColor;
    staffedAirport?: number;
    defaultAirport?: number;
    aircraft?: PartialRecord<MapAircraftStatus, UserMapSettingsColor> & {
        main?: UserMapSettingsColor;
    };
    runways?: UserMapSettingsColor;
    gates?: number;
}

export interface UserMapSettingsVisibilityATC {
    firs: boolean;
    approach: boolean;
    ground: boolean;
}

export type UserMapSettingsTurns = 'magma' | 'inferno' | 'rainbow' | 'viridis';

export interface IUserMapSettings {
    visibility: {
        atc?: Partial<UserMapSettingsVisibilityATC> | boolean;
        atcLabels?: boolean;
        airports?: boolean;
        pilots?: boolean;
        gates?: boolean;
        runways?: boolean;
        pilotsInfo?: boolean;
        atcInfo?: boolean;
    };
    heatmapLayer: boolean;
    highlightEmergency: boolean;
    vatglasses: {
        active?: boolean;
        autoEnable?: boolean;
        combined?: boolean;
    };
    groundTraffic: {
        hide?: 'always' | 'lowZoom' | 'never';
        excludeMyArrival?: boolean;
        excludeMyLocation?: boolean;
    };
    navigraphLayers: Partial<{
        disable: boolean;
        gatesFallback?: boolean;
        hideTaxiways?: boolean;
        hideGateGuidance?: boolean;
        hideRunwayExit?: boolean;
        hideDeicing?: boolean;
    }>;
    aircraftScale: number;
    airportsMode: 'staffedOnly' | 'staffedAndGroundTraffic' | 'all';
    tracks: {
        mode?: 'arrivalsOnly' | 'arrivalsAndLanded' | 'departures' | 'allAirborne' | 'ground' | 'all';
        showOutOfBounds?: boolean;
        limit?: number;
    };
    hideATISOnly: boolean;
    airportsCounters: {
        syncDeparturesArrivals?: boolean;
        departuresMode?: 'total' | 'totalMoving' | 'airborne' | 'ground' | 'groundMoving' | 'hide';
        arrivalsMode?: IUserMapSettings['airportsCounters']['departuresMode'];
        horizontalCounter?: 'total' | 'prefiles' | 'ground' | 'groundMoving' | 'hide';
        disableTraining?: boolean;
        syncWithOverlay?: boolean;
    };
    colors: {
        light?: UserMapSettingsColors;
        default?: UserMapSettingsColors;
        turns?: UserMapSettingsTurns;
        turnsTransparency?: number;
    };
}

export type UserMapSettings = Partial<IUserMapSettings>;

export async function handleMapSettingsEvent(event: H3Event) {
    let userId: number | undefined;

    const isValidate = event.path.endsWith('validate');

    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        userId = user.id;
        if (await freezeH3Request(event, user.id) !== true) return;

        const id = getRouterParam(event, 'id');

        if (id && event.method !== 'GET' && event.method !== 'PUT' && event.method !== 'DELETE') {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Only PUT, DELETE and GET are allowed when using id',
            });
        }
        else if (!id && event.method !== 'GET' && event.method !== 'POST') {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Only POST is allowed when not using id',
            });
        }

        const presets = await prisma.userPreset.findMany({
            where: {
                userId: user.id,
                type: UserPresetType.MAP_SETTINGS,
            },
        });

        let settings: UserPreset | null = null;

        if (id) {
            settings = presets.find(x => x.id === +id) ?? null;

            if (!settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'This preset was not found for your user ID',
                });
            }
        }

        if (event.method === 'POST' || event.method === 'PUT') {
            const body = await readBody<Partial<UserPreset>>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'You must pass body to this route',
                });
            }

            if (!body.name && !settings && !isValidate) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Name is required when creating settings',
                });
            }

            if (body.name && body.name.length > 30) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Max name length is 30',
                });
            }

            if (!body.json && !settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Json is required when creating settings',
                });
            }

            if (body.json) {
                body.json = body.json as Record<string, any>;

                for (const [key, value] of Object.entries(body.json) as [keyof IUserMapSettings, unknown][]) {
                    if (!(key in validators)) {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete body.json[key];

                        continue;
                    }

                    if (!validators[key](value)) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: `${ key } validation has failed`,
                        });
                    }
                }
            }

            if (body.name) {
                if (body.name.length > 20) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: 'Name validation failed: max 20 symbols are allowed',
                    });
                }

                const duplicatedPreset = presets.find(x => x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

                if (duplicatedPreset) {
                    if (getQuery(event).force === '1') {
                        await prisma.userPreset.delete({
                            where: {
                                id: duplicatedPreset.id,
                            },
                        });
                    }
                    else {
                        return handleH3Error({
                            event,
                            statusCode: 409,
                            data: 'A preset with this name already exists',
                        });
                    }
                }
            }

            if (isValidate) {
                return {
                    status: 'ok',
                };
            }

            if (settings) {
                await prisma.userPreset.update({
                    where: {
                        id: settings.id,
                    },
                    data: {
                        name: body.name ?? settings.name,
                        json: (body.json ?? settings.json ?? undefined),
                    },
                });
            }
            else {
                const userPresets = await prisma.userPreset.count({
                    where: {
                        userId: user.id,
                        type: UserPresetType.MAP_SETTINGS,
                    },
                });

                if (userPresets > MAX_MAP_PRESETS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: 'Only 3 settings presets are allowed',
                    });
                }

                await prisma.userPreset.create({
                    data: {
                        userId: user.id,
                        type: UserPresetType.MAP_SETTINGS,
                        name: body.name as string,
                        json: body.json!,
                    },
                });
            }

            return body.json ?? {
                status: 'ok',
            };
        }
        else if (event.method === 'DELETE' && settings) {
            await prisma.userPreset.delete({
                where: {
                    id: settings.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return settings;
            }
            else {
                return presets;
            }
        }
        else {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Incorrect method received',
            });
        }
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
    finally {
        if (userId) {
            unfreezeH3Request(userId);
        }
    }
}

export type UserMapPreset = UserPreset & {
    json: UserMapSettings;
};
