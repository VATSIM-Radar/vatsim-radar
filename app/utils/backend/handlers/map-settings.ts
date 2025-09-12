import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/backend/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';
import { isObject, isNumber, MAX_MAP_PRESETS } from '~/utils/shared';
import type { MapAircraftStatus } from '~/composables/pilots';
import type { PartialRecord } from '~/types';
import type { UserPreset } from '@prisma/client';
import { UserPresetType } from '@prisma/client';
import {
    validateColor,
    validateRandomObjectKeys,
    validateTransparency,
} from '~/utils/backend/handlers/index';

const visibilityKeys: Array<keyof UserMapSettingsVisibilityATC> = ['firs', 'approach', 'ground'];
const groundHideKeys: Array<IUserMapSettings['groundTraffic']['hide']> = ['always', 'lowZoom', 'never'];
const airportsModeKeys: Array<IUserMapSettings['airportsMode']> = ['staffedOnly', 'staffedAndGroundTraffic', 'all'];
const counterModeKeys: Array<IUserMapSettings['airportsCounters']['arrivalsMode']> = ['total', 'totalMoving', 'ground', 'groundMoving', 'airborne', 'hide'];
const prefilesModeKeys: Array<IUserMapSettings['airportsCounters']['horizontalCounter']> = ['total', 'prefiles', 'ground', 'groundMoving', 'hide'];
const turnsKeys: Array<IUserMapSettings['colors']['turns']> = ['magma', 'inferno', 'rainbow', 'viridis'];
const tracksKeys: Array<IUserMapSettings['tracks']['mode']> = ['arrivalsOnly', 'arrivalsAndLanded', 'departures', 'ground', 'allAirborne', 'all'];
const navigraphKeys: Array<keyof IUserMapSettings['navigraphLayers']> = ['disable', 'gatesFallback', 'hideTaxiways', 'hideGateGuidance', 'hideRunwayExit', 'hideDeicing'];

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
    if (!isObject(val) || !validateRandomObjectKeys(val, ['firs', 'uirs', 'centerText', 'centerBg', 'approach', 'staffedAirport', 'defaultAirport', 'approachBookings', 'centerBookings', 'gates', 'runways', 'aircraft'])) return false;

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
    if ('approachBookings' in val && !validateColor(val.approachBookings)) return false;
    if ('centerBookings' in val && !validateColor(val.centerBookings)) return false;
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
        if ('pilotLabels' in val && typeof val.pilotLabels !== 'boolean') return false;
        if ('bookings' in val && typeof val.bookings !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['atc', 'atcLabels', 'airports', 'bookings', 'pilots', 'gates', 'runways', 'pilotsInfo', 'atcInfo', 'pilotLabels'])) return false;

        return true;
    },
    bookingHours: val => {
        if (typeof val === 'string') val = Number(val);
        if (isNaN(val as number)) return false;

        return isNumber(val, 1) && val > 0 && val < 5;
    },
    bookingsLocalTimezone: val => {
        return typeof val === 'boolean';
    },
    disableQueryUpdate: val => {
        return typeof val === 'boolean';
    },
    shortAircraftView: val => {
        return typeof val === 'boolean';
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
        if ('autoLevel' in val && typeof val.autoLevel !== 'boolean') return false;
        if ('combined' in val && typeof val.combined !== 'boolean') return false;

        if (!validateRandomObjectKeys(val, ['active', 'combined', 'autoEnable', 'autoLevel'])) return false;

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
        return isNumber(val, 1) && val > 0 && val < 5;
    },
    airportsMode: val => {
        return typeof val === 'string' && airportsModeKeys.includes(val as any);
    },
    airportsCounters: val => {
        if (!isObject(val)) return false;

        if ('showCounters' in val && typeof val.show !== 'boolean') return false;
        if ('syncDeparturesArrivals' in val && typeof val.syncDeparturesArrivals !== 'boolean') return false;
        if ('disableTraining' in val && typeof val.disableTraining !== 'boolean') return false;
        if ('syncWithOverlay' in val && typeof val.syncWithOverlay !== 'boolean') return false;
        if ('departuresMode' in val && (typeof val.departuresMode !== 'string' || !counterModeKeys.includes(val.departuresMode as any))) return false;
        if ('horizontalCounter' in val && (typeof val.horizontalCounter !== 'string' || !prefilesModeKeys.includes(val.horizontalCounter as any))) return false;
        if ('arrivalsMode' in val && (typeof val.arrivalsMode !== 'string' || !counterModeKeys.includes(val.arrivalsMode as any))) return false;

        if (!validateRandomObjectKeys(val, ['showCounters', 'syncDeparturesArrivals', 'disableTraining', 'syncWithOverlay', 'departuresMode', 'arrivalsMode', 'horizontalCounter'])) return false;

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
        if (!validateRandomObjectKeys(val, ['mode', 'limit', 'showOutOfBounds'])) return false;

        if ('mode' in val && (typeof val.mode !== 'string' || !tracksKeys.includes(val.mode as any))) return false;
        if ('showOutOfBounds' in val && typeof val.showOutOfBounds !== 'boolean') return false;
        if ('limit' in val && (typeof val.limit !== 'number' || isNaN(val.limit) || val.limit < 1 || val.limit > 50)) return false;

        return true;
    },
    defaultAirportZoomLevel: val => {
        return isNumber(val, 1) && val > 0 && val < 50;
    },
    pilotLabelLimit: val => {
        return isNumber(val, 0) && val >= 0 && val <= 1000;
    },
    airportCounterLimit: val => {
        return isNumber(val, 0) && val >= 0 && val <= 1000;
    },
    aircraftHoverDelay: val => {
        if (typeof val === 'boolean') return true;
        return isNumber(val, 0) && val >= 0 && val <= 10000;
    },
    navigraphData: val => {
        if (!isObject(val)) return false;
        if (!validateRandomObjectKeys(val, ['ndb', 'vordme', 'waypoints', 'holdings', 'airways', 'isModeAuto', 'mode'])) return false;

        if ('ndb' in val && typeof val.ndb !== 'boolean') return false;
        if ('vordme' in val && typeof val.vordme !== 'boolean') return false;
        if ('waypoints' in val && typeof val.waypoints !== 'boolean') return false;
        if ('holdings' in val && typeof val.holdings !== 'boolean') return false;
        if ('isModeAuto' in val && typeof val.isModeAuto !== 'boolean') return false;
        if ('mode' in val && val.mode !== 'vfr' && val.mode !== 'ifr' && val.mode !== 'ifrHigh' && val.mode !== 'ifrLow' && val.mode !== 'both') return false;
        if ('airways' in val) {
            if (!isObject(val.airways)) return false;
            if (!validateRandomObjectKeys(val.airways, ['enabled', 'showAirwaysLabel', 'showWaypointsLabel'])) return false;

            if ('enabled' in val.airways && typeof val.airways.enabled !== 'boolean') return false;
            if ('showAirwaysLabel' in val.airways && typeof val.airways.showAirwaysLabel !== 'boolean') return false;
            if ('showWaypointsLabel' in val.airways && typeof val.airways.showWaypointsLabel !== 'boolean') return false;
        }

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
    approachBookings?: UserMapSettingsColor;
    centerBookings?: UserMapSettingsColor;
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
export type NavigraphSettingsLevel = 'ifrHigh' | 'ifrLow' | 'vfr' | 'both';

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
        bookings?: boolean;
        pilotLabels?: boolean;
    };
    bookingHours: number;
    bookingsLocalTimezone?: boolean;
    disableQueryUpdate?: boolean;
    shortAircraftView?: boolean;
    aircraftHoverDelay?: number | boolean;
    defaultAirportZoomLevel: number;
    heatmapLayer: boolean;
    highlightEmergency: boolean;
    vatglasses: {
        active?: boolean;
        autoEnable?: boolean;
        autoLevel?: boolean;
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
    navigraphData: Partial<{
        ndb: boolean;
        vordme: boolean;
        waypoints: boolean;
        terminalWaypoints: boolean;
        holdings: boolean;
        mode: NavigraphSettingsLevel;
        isModeAuto: boolean;
        airways: Partial<{
            enabled: boolean;
            showAirwaysLabel: boolean;
            showWaypointsLabel: boolean;
        }>;
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
        showCounters?: boolean;
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
    pilotLabelLimit: number;
    airportCounterLimit: number;
}

export type UserMapSettings = Partial<IUserMapSettings>;

export async function handleMapSettingsEvent(event: H3Event) {
    let userId: number | undefined;

    const isValidate = event.path.endsWith('validate');

    try {
        const user = await findUserByCookie(event);

        if (!user && !isValidate) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        userId = user?.id;
        if (user && await freezeH3Request(event, user.id) !== true) return;

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

        const presets = (!user && isValidate)
            ? []
            : await prisma.userPreset.findMany({
                where: {
                    userId: user!.id,
                    type: UserPresetType.MAP_SETTINGS,
                },
                orderBy: [
                    {
                        order: 'asc',
                    },
                    {
                        id: 'desc',
                    },
                ],
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
                        userId: user!.id,
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
                        userId: user!.id,
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
