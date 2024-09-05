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

export interface UserMapSettings {
    visibility: {
        atc?: Partial<{
            firs: boolean;
            approach: boolean;
            ground: boolean;
        }> | boolean;
        pilots?: boolean;
    };
    heatmapLayer?: boolean;
    aircraftScale?: number;
    colors?: {
        firs?: string;
        uirs?: string;
        approach?: string;
        aircraft?: PartialRecord<MapAircraftStatus, string> & {
            main?: string;
        };
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
