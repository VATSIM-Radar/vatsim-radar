import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { MapAircraftMode, UserLocalSettings } from '~/types/map';

import type { ThemesList } from '~/utils/backend/styles';
import type { VatDataVersions } from '~/types/data';
import type { VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryData } from '~/types/data/vatsim';
import { setVatsimDataStore } from '~/composables/data';
import { useMapStore } from '~/store/map';
import type { Coordinate } from 'ol/coordinate';
import type { UserMapPreset, UserMapSettings } from '~/utils/backend/handlers/map-settings';
import type { TurnsBulkReturn } from '~/server/api/data/vatsim/pilot/turns';
import type { UserListLive, UserListLiveUser } from '~/utils/backend/handlers/lists';
import type { UserFilter, UserFilterPreset } from '~/utils/backend/handlers/filters';
import type { IEngine } from 'ua-parser-js';
import { isFetchError } from '~/utils/shared';
import type { UserBookmarkPreset } from '~/utils/backend/handlers/bookmarks';
import { useIsDebug } from '~/composables';

export interface SiteConfig {
    hideSectors?: boolean;
    hideAirports?: boolean;
    hideAllExternal?: boolean;
    hideOverlays?: boolean;
    hideHeader?: boolean;
    hideFooter?: boolean;
    hideBookings?: boolean;

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

export type VRInitStatusResult = boolean | 'notRequired' | 'loading' | 'failed';
export type VRInitStatus = Record<'vatspy' | 'simaware' | 'navigraph' | 'airlines' | 'vatglasses' | 'updatesCheck' | 'dataGet' | 'status', VRInitStatusResult>;

export const useStore = defineStore('index', {
    state: () => ({
        user: null as null | FullUser,
        version: '',
        theme: 'default' as ThemesList,
        localSettings: {} as UserLocalSettings,
        mapSettings: {} as UserMapSettings,
        mapPresets: [] as UserMapPreset[],
        mapPresetsFetched: false,
        filter: {} as UserFilter,
        activeFilter: {} as UserFilter,
        filterPresets: [] as UserFilterPreset[],
        bookmarks: [] as UserBookmarkPreset[],
        config: {} as SiteConfig,

        bookingsStartTime: new Date(),
        bookingsEndTime: new Date(Date.now() + (5 * 60 * 60 * 1000)),
        bookingOverride: false,

        presetImport: {
            preset: null as UserMapSettings | false | null,
            name: '',
            save: null as (() => any) | null,
            error: false as false | (() => Promise<any>),
        },

        showPilotStats: false,
        dataInProgress: false,

        featuredAirportsOpen: false,
        featuredVisibleOnly: false,
        menuFriendsOpen: false,
        mapBookingOpen: false,

        updateRequired: false,
        isTabVisible: false,
        updateATCTracons: false,
        cookieCustomize: false,

        loginPopup: false,
        deleteAccountPopup: false,
        deleteNavigraphPopup: false,
        settingsPopup: false,
        settingsPopupTab: 'main' as 'main' | 'favorite',
        airacPopup: false,
        searchActive: false,
        metarRequest: false as boolean | string[],

        viewport: {
            width: 0,
        },

        isMobile: false,
        isTablet: false,
        isMobileOrTablet: false,
        isPC: false,
        scrollbarWidth: 0,
        device: 'desktop' as 'desktop' | 'mobile' | 'tablet',
        engine: '' as IEngine['name'],

        initStatus: {
            vatspy: false,
            simaware: false,
            navigraph: false,
            airlines: false,
            vatglasses: false,
            updatesCheck: false,
            dataGet: false,
            status: false,
        } as VRInitStatus,
    }),
    getters: {
        fullAirportsUpdate(): boolean {
            return (this.featuredAirportsOpen && !this.featuredVisibleOnly) || this.updateATCTracons;
        },
        datalistNotSupported(): boolean {
            return this.engine === 'Gecko';
        },
        isTouch(): boolean {
            return this.device !== 'desktop';
        },
        getCurrentTheme(): 'light' | 'default' {
            switch (this.theme) {
                case 'sa':
                    return 'default';
            }

            return this.theme;
        },
        lists(): UserListLive[] {
            if (!this.user) return [];

            const lists = this.user.lists.slice(0);
            const listsUsers = new Set(lists.flatMap(x => x.users.map(x => x.cid)));
            const foundUsers: Record<number, Pick<UserListLiveUser, 'type' | 'data'>> = {};

            const dataStore = useDataStore();

            if (!lists.some(x => x.type === 'FRIENDS')) {
                lists.unshift({
                    id: 0,
                    name: 'Friends',
                    color: 'success300',
                    type: 'FRIENDS',
                    showInMenu: true,
                    users: [],
                });
            }

            if (listsUsers.size) {
                for (const pilot of dataStore.vatsim.data.pilots.value) {
                    if (listsUsers.has(pilot.cid)) {
                        foundUsers[pilot.cid] = {
                            type: 'pilot',
                            data: pilot,
                        };
                    }
                }

                for (const prefile of dataStore.vatsim.data.prefiles.value) {
                    if (listsUsers.has(prefile.cid)) {
                        foundUsers[prefile.cid] = {
                            type: 'prefile',
                            data: prefile,
                        };
                    }
                }

                for (const atc of dataStore.vatsim.data.general.value?.sups ?? []) {
                    if (listsUsers.has(atc.cid)) {
                        foundUsers[atc.cid] = {
                            type: 'sup',
                            data: atc,
                        };
                    }
                }

                for (const atc of dataStore.vatsim.data.locals.value) {
                    if (atc.atc.isATIS) continue;
                    if (listsUsers.has(atc.atc.cid)) {
                        foundUsers[atc.atc.cid] = {
                            type: 'atc',
                            data: atc.atc,
                        };
                    }
                }

                for (const atc of dataStore.vatsim.data.firs.value) {
                    if (atc.controller.isATIS) continue;
                    if (listsUsers.has(atc.controller.cid)) {
                        foundUsers[atc.controller.cid] = {
                            type: atc.controller.rating === 1 ? 'sup' : 'atc',
                            data: atc.controller,
                        };
                    }
                }
            }

            return lists.map(list => ({
                ...list,
                users: list.users.map(user => ({
                    ...user,
                    ...foundUsers[user.cid] ?? {
                        type: 'offline',
                        data: undefined,
                    },
                } as UserListLiveUser)).sort((a, b) => {
                    const aOnline = a.type !== 'offline';
                    const bOnline = b.type !== 'offline';

                    if (bOnline && !aOnline) return 1;
                    if (!bOnline && aOnline) return -1;
                    return 0;
                }),
            }));
        },
        friends(): UserListLiveUser[] {
            return this.lists.filter(x => x.showInMenu).flatMap(x => x.users.filter(x => x.type !== 'offline').map(user => ({
                ...user,
                listName: x.name,
            })));
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

                if (useIsDebug()) {
                    dataStore.versions.value = await $fetch<VatDataVersions>('/api/data/versions');

                    if (
                        dataStore.simaware.value?.version && dataStore.vatspy.value?.version &&
                        (
                            (dataStore.vatglasses.value?.version && dataStore.versions.value.vatglasses !== dataStore.vatglasses.value?.version) ||
                            dataStore.versions.value.simaware !== dataStore.simaware.value?.version ||
                            dataStore.versions.value.vatspy !== dataStore.vatspy.value?.version
                        )
                    ) location.reload();
                }

                if (force || !dataStore.vatsim._mandatoryData.value || (!versions || versions.data !== dataStore.vatsim.updateTimestamp.value)) {
                    if (!dataStore.vatsim.data) dataStore.vatsim.data = {} as any;

                    const data = await $fetch<VatsimLiveData | VatsimLiveDataShort>(`/api/data/vatsim/data${ dataStore.vatsim.data.general.value?.connected_clients ? '/short' : '' }`, {
                        timeout: 1000 * 60,
                    });
                    await setVatsimDataStore(data);

                    if (String(config.public.DISABLE_WEBSOCKETS) === 'true' || this.localSettings.traffic?.disableFastUpdate || !dataStore.vatsim.mandatoryData.value) {
                        const mandatoryData = await $fetch<VatsimMandatoryData>(`/api/data/vatsim/data/mandatory`, {
                            timeout: 1000 * 60,
                        });
                        if (mandatoryData) setVatsimMandatoryData(mandatoryData);
                        if (dataStore.vatsim.data.general.value) {
                            dataStore.vatsim.data.general.value.update_timestamp = data.general.update_timestamp;
                        }
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
        async refreshUser() {
            this.user = await $fetch<FullUser>('/api/user');
        },
        async initPresetImport({ save, file, prefix }: {
            save: () => any;
            prefix: string;
            file: string;
        }) {
            const json = JSON.parse(file);

            const saveResult = () => {
                this.presetImport = {
                    preset: null,
                    name: '',
                    save,
                    error: false,
                };

                if ('id' in json) {
                    this.presetImport.name = json.name;
                    this.presetImport.preset = json.json;
                }
                else {
                    this.presetImport.preset = json;
                }
            };

            try {
                const validation = await $fetch<{ status: 'ok' }>(`/api/user/${ prefix }/validate`, {
                    method: 'POST',
                    body: 'id' in json
                        ? json
                        : {
                            json,
                        },
                });

                if (validation.status === 'ok') saveResult();
            }
            catch (e) {
                if (!isFetchError(e) || e.statusCode !== 409) {
                    throw e;
                }
                else {
                    saveResult();
                }
            }
        },
        async fetchMapPresets() {
            this.mapPresets = await $fetch<UserMapPreset[]>('/api/user/settings/map');
            this.mapPresetsFetched = true;
        },
        async fetchFiltersPresets() {
            this.filterPresets = await $fetch<UserFilterPreset[]>('/api/user/filters');
        },
        async fetchBookmarks() {
            this.bookmarks = await $fetch<UserFilterPreset[]>('/api/user/bookmarks');
        },
    },
});
