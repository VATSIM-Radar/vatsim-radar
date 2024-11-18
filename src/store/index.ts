import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { MapAircraftMode, UserLocalSettings } from '~/types/map';

import type { ThemesList } from '~/utils/backend/styles';
import type { VatDataVersions } from '~/types/data';
import type { VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryData } from '~/types/data/vatsim';
import { setVatsimDataStore } from '~/composables/data';
import { useMapStore } from '~/store/map';
import type { Coordinate } from 'ol/coordinate';
import type { UserMapPreset, UserMapSettings } from '~/utils/backend/map-settings';
import type { TurnsBulkReturn } from '~/server/api/data/vatsim/pilot/turns';

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
    onlyAirportsAircraft?: boolean;
    showInfoForPrimaryAirport?: boolean;
    area?: [Coordinate, Coordinate];
    center?: Coordinate;
    zoom?: number;

    showCornerLogo?: boolean;
}

export const useStore = defineStore('index', {
    state: () => ({
        user: null as null | FullUser,
        version: '',
        theme: 'default' as ThemesList,
        localSettings: {} as UserLocalSettings,
        mapSettings: {} as UserMapSettings,
        mapPresets: [] as UserMapPreset[],
        mapPresetsSaveFail: false as false | (() => Promise<any>),
        config: {} as SiteConfig,

        showPilotStats: false,
        dataInProgress: false,

        featuredAirportsOpen: false,
        featuredVisibleOnly: false,

        updateRequired: false,
        isTabVisible: false,

        loginPopup: false,
        deleteAccountPopup: false,
        deleteNavigraphPopup: false,
        settingsPopup: false,
        airacPopup: false,
        searchActive: false,

        viewport: {
            width: 0,
        },

        isMobile: false,
        isTablet: false,
        isMobileOrTablet: false,
        isPC: false,
        scrollbarWidth: 0,
    }),
    getters: {
        getCurrentTheme(): 'light' | 'default' {
            switch (this.theme) {
                case 'sa':
                    return 'default';
            }

            return this.theme;
        },
    },
    actions: {
        async getVATSIMData(force = false, onFetch?: () => any) {
            if (this.dataInProgress) return;

            const dataStore = useDataStore();
            const config = useRuntimeConfig();
            const mapStore = useMapStore();

            try {
                this.dataInProgress = true;

                const versions = !force && await $fetch<VatDataVersions['vatsim'] & { time: number }>('/api/data/vatsim/versions', {
                    timeout: 1000 * 30,
                });

                if (versions) {
                    dataStore.vatsim.versions.value = versions;
                }

                if (force || !dataStore.vatsim._mandatoryData.value || (!versions || versions.data !== dataStore.vatsim.updateTimestamp.value)) {
                    if (!dataStore.vatsim.data) dataStore.vatsim.data = {} as any;

                    const data = await $fetch<VatsimLiveData | VatsimLiveDataShort>(`/api/data/vatsim/data${ dataStore.vatsim.data.general.value ? '/short' : '' }`, {
                        timeout: 1000 * 60,
                    });
                    await setVatsimDataStore(data);

                    if (String(config.public.DISABLE_WEBSOCKETS) === 'true' || this.localSettings.traffic?.disableFastUpdate || !dataStore.vatsim.mandatoryData.value) {
                        const mandatoryData = await $fetch<VatsimMandatoryData>(`/api/data/vatsim/data/mandatory`, {
                            timeout: 1000 * 60,
                        });
                        if (mandatoryData) setVatsimMandatoryData(mandatoryData);
                        dataStore.vatsim.data.general.value!.update_timestamp = data.general.update_timestamp;
                        dataStore.vatsim.updateTimestamp.value = data.general.update_timestamp;
                    }

                    await onFetch?.();

                    if (!mapStore.localTurns.size) return;

                    mapStore.turnsResponse = await $fetch<TurnsBulkReturn[]>('/api/data/vatsim/pilot/turns', {
                        method: 'POST',
                        body: [...mapStore.localTurns],
                    });

                    mapStore.localTurns.clear();
                }
            }
            catch (e) {
                console.error(e);
            }
            finally {
                this.dataInProgress = false;
            }
        },
    },
});
