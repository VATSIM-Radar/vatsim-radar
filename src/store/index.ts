import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { UserLocalSettings } from '~/types/map';
import type { ThemesList } from '~/modules/styles';

export interface SiteConfig {
    hideSectors?: boolean;
    hideAirports?: boolean;
    theme?: ThemesList;
    hideHeader?: boolean;
    hideFooter?: boolean;
    allAircraftGreen?: boolean;
    airports?: string[];
    airport?: string;
    hideAllExternal?: boolean;
    hideOverlays?: boolean;
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
