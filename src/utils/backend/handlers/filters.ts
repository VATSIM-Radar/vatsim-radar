import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { UserPreset } from '@prisma/client';
import type { UserMapSettingsColor } from '~/utils/backend/handlers/map-settings';

export interface IUserFilter {
    users: Partial<{
        pilots: {
            type?: 'prefix' | 'include';
            value?: string[];
        };
        atc: IUserFilter['users']['pilots'];
        lists: number[];
        cids: number[];
        strategy: 'and' | 'or';
    }>;
    airports: Partial<{
        departure: string[];
        arrival: string[];
        routes: string[];
    }>;
    atc: Partial<{
        ratings: number[];
        facilities: number[];
    }>;
    flights: Partial<{
        status: 'departing' | 'airborne' | 'arrived';
        aircraft: string[];
        type: 'all' | 'domestic' | 'international';
        excludeNoFlightPlan: boolean;
        squawks: string[];
        altitude: {
            strategy?: 'below' | 'above';
            value?: string;
        };
    }>;
    eventId: number;
    others: 'hide' | Partial<{
        othersOpacity?: number;
        ourColor?: UserMapSettingsColor;
    }>;
}

export type UserFilter = Partial<IUserFilter>;

export type UserFilterPreset = UserPreset & {
    json: UserFilter;
};
