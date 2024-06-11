import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { MapAircraftMode, MapAirport, UserLocalSettings } from '~/types/map';

import type { ThemesList } from '~/utils/backend/styles';

export interface SiteConfig {
    hideSectors?: boolean;
    hideAirports?: boolean;
    hideAllExternal?: boolean;
    hideOverlays?: boolean;
    hideHeader?: boolean;
    hideFooter?: boolean;

    theme?: ThemesList;
    allAircraftGreen?: boolean;

    airports?: string[];
    airport?: string;
    airportMode?: MapAircraftMode;
    onlyAirportAircraft?: boolean;
    showInfoForPrimaryAirport?: boolean;
}

export const useStore = defineStore('index', {
    state: () => ({
        datetime: Date.now(),

        user: null as null | FullUser,
        version: '',
        theme: 'default' as ThemesList,
        localSettings: {} as UserLocalSettings,
        config: {} as SiteConfig,
    }),
});
