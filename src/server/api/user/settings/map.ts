import type { UserSettings } from '~/utils/backend/user';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import type { PartialRecord } from '~/types';
import type { MapAircraftStatus } from '~/composables/pilots';

const validators: Record<keyof UserSettings, (val: unknown) => boolean> = {
    autoFollow: val => typeof val === 'boolean',
    autoZoom: val => typeof val === 'boolean',
    autoShowAirportTracks: val => typeof val === 'boolean',
    toggleAircraftOverlays: val => typeof val === 'boolean',
    headerName: val => (typeof val === 'string' && val.length <= 30) || val === null,
    seenVersion: val => (typeof val === 'string' && val.length <= 15) || val === null,
};

export interface UserMapSettingsColors {
    firs?: string;
    uirs?: string;
    approach?: string;
    aircraft?: PartialRecord<MapAircraftStatus, string> & {
        main?: string;
    };
}

export interface UserMapSettings {
    visibility: {
        atc?: Partial<{
            firs: boolean;
            approach: boolean;
            ground: boolean;
        }> | boolean;
        pilots?: boolean;
        gates?: boolean;
        runways?: boolean;
    };
    heatmapLayer?: boolean;
    groundTraffic?: {
        hide?: 'always' | 'lowZoom' | 'never';
        excludeMyArrival?: boolean;
        excludeMyLocation?: boolean;
    };
    aircraftScale?: number;
    airportsMode?: 'staffedOnly' | 'groundTrafficOnly' | 'all';
    airportsCounters?: {
        showSameAirportCounter?: boolean;
        departuresMode?: 'total' | 'totalMoving' | 'airborne' | 'ground';
        arrivalsMode?: 'total' | 'totalMoving' | 'airborne' | 'ground';
    };
    colors?: {
        light?: UserMapSettingsColors;
        default?: UserMapSettingsColors;
        turns?: string;
    };
}

export default defineEventHandler(async event => {
    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
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
