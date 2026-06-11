import { defineStore } from 'pinia';
import type { FullUser, UserMessage } from '~/utils/server/user';
import type { MapAircraftMode, UserLocalSettings } from '~/types/map';

import type { ThemesList } from '~/utils/colors';
import type { VatDataVersions } from '~/types/data';
import type {
    VatsimActiveEvent,
    VatsimBooking,
    VatsimLiveCompactData, VatsimLiveCompactDataShort,
    VatsimMandatoryData,
} from '~/types/data/vatsim';
import { setVatsimDataStore } from '~/composables/render/storage';
import type { Coordinate } from 'ol/coordinate.js';
import type {
    UserListLive,
    UserListLiveUser,
    UserListLiveUserPilot,
} from '~/utils/server/handlers/lists';
import type { UserFilter, UserFilterPreset } from '~/utils/server/handlers/filters';
import type { IEngine } from 'ua-parser-js';
import type { UserMessageType } from '~/utils/shared';
import type { UserBookmarkPreset } from '~/utils/server/handlers/bookmarks';
import { useIsDebug } from '~/composables';
import { clientDB } from '~/composables/render/idb';
import type { PartialRecord } from '~/types';
import type { SnackbarType } from '~/components/ui/data/UiSnackbar.vue';
import type { UserSettingsV2Partial } from '~/utils/settings/types';

export interface SiteConfig {
    hideSectors?: boolean;
    hideAirports?: boolean;
    hideAllExternal?: boolean;
    hideOverlays?: boolean;
    hideHeader?: boolean;
    hideFooter?: boolean;
    hideBookings?: boolean;
    hidePaddings?: boolean;

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

export interface LocalNotification {
    id?: number;
    type: SnackbarType;
    text: string;
    timeout: number;
    closable?: boolean;
}

export const isFilterActive = globalComputed(() => useCookie<boolean>('is-filter-active', {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'none',
    secure: true,
}));

export const useStore = defineStore('index', {
    state: () => ({
        user: null as null | FullUser,
        version: '',
        mounted: false,
        theme: 'default' as ThemesList,
        localSettings: {} as UserLocalSettings,
        mapPresetsFetched: false,

        filter: {} as UserFilter,
        tempFilter: null as UserFilter | null,
        isFilterActive: true,

        filterPresets: [] as UserFilterPreset[],
        bookmarks: [] as UserBookmarkPreset[],
        config: {} as SiteConfig,

        events: [] as VatsimActiveEvent[],
        fetchedBookings: [] as VatsimBooking[],
        bookingsStartTime: new Date(),
        bookingsEndTime: new Date(Date.now() + (5 * 60 * 60 * 1000)),
        bookingOverride: false,

        presetImport: {
            preset: null as UserSettingsV2Partial | false | null,
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
        cookieCustomize: false as boolean | 'init',

        loginPopup: false,
        deleteAccountPopup: false,
        deleteNavigraphPopup: false,
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
        isPCWide: false,
        scrollbarWidth: 0,
        device: 'desktop' as 'desktop' | 'mobile' | 'tablet',
        touch: false,
        engine: '' as IEngine['name'],

        initStatus: {
            vatspy: false,
            simaware: false,
            navigraph: false,
            airlines: false,
            vatglasses: false,
            updatesCheck: false,
            dataGet: false,
        } as VRInitStatus,

        bench: {
            updateAircraft: 0,
            updateVG: 0,
            updateATC: 0,
            aircraftRender: 0,
            aircraftPrepare: 0,
            airportsRender: 0,
            airportsPrepare: 0,
            sectorsRender: 0,
            vgCombine: 0,
            vgRestyle: 0,
        },

        wsOpen: false,
        wsCallsign: '',
        localNotifications: [] as LocalNotification[],
    }),
    getters: {
        activeFilter(): UserFilter | null {
            if (this.tempFilter) return this.tempFilter;

            if (!this.isFilterActive || Object.keys(this.filter).length === 0) return null;

            return this.filter;
        },
        bookings(): VatsimBooking[] {
            const dataStore = useDataStore();
            return this.fetchedBookings.filter(x => x.end > dataStore.time.value);
        },
        datalistNotSupported(): boolean {
            return this.engine === 'Gecko';
        },
        isTouch(): boolean {
            return this.device !== 'desktop';
        },
        getCurrentTheme(): 'light' | 'default' {
            return this.theme;
        },
        lists(): UserListLive[] {
            if (!this.user) return [];

            const lists = this.user.lists.slice(0);
            const listsUsers = new Set(lists.flatMap(x => x.users.map(x => x.cid)));
            const foundUsers: Record<number, Omit<UserListLiveUser, 'name' | 'cid'>> = {};

            const dataStore = useDataStore();

            if (!lists.some(x => x.type === 'FRIENDS')) {
                lists.unshift({
                    id: 0,
                    name: 'Friends',
                    color: 'green500',
                    type: 'FRIENDS',
                    showInMenu: true,
                    users: [],
                });
            }

            const friendsObservers: UserListLiveUserPilot['sharedPilots'] = dataStore.vatsim.data.observers.value
                .filter(x => listsUsers.has(x.cid))
                .map(x => ({
                    ...lists.find(y => y.users.some(y => y.cid === x.cid))?.users.find(y => y.cid === x.cid),
                    data: x,
                } as UserListLiveUserPilot['sharedPilots'][0]))
                .filter(x => 'name' in x);

            if (listsUsers.size) {
                for (const pilot of dataStore.vatsim.data.pilots.value) {
                    if (listsUsers.has(pilot.cid)) {
                        foundUsers[pilot.cid] = {
                            type: 'pilot',
                            // @ts-expect-error not working because ts is stupid
                            sharedPilots: friendsObservers.filter(x => x.data.callsign.slice(0, x.data.callsign.length - 1) === pilot.callsign),
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

                for (const booking of this.bookings) {
                    if (listsUsers.has(booking.atc.cid)) {
                        foundUsers[booking.atc.cid] = {
                            type: 'booking',
                            data: booking,
                        };
                    }
                }

                for (const atc of dataStore.vatsim.data.controllers.value) {
                    if (atc.duplicated) continue;
                    if (listsUsers.has(atc.cid)) {
                        foundUsers[atc.cid] = {
                            type: 'atc',
                            data: atc,
                        };
                    }
                }

                for (const atc of dataStore.vatsim.data.general.value?.sups ?? []) {
                    if (listsUsers.has(atc.cid)) {
                        if (foundUsers[atc.cid]) foundUsers[atc.cid].suping = atc.callsign;
                        else {
                            foundUsers[atc.cid] = {
                                type: 'sup',
                                data: atc,
                            };
                        }
                    }
                }
            }

            return lists.map(list => ({
                ...list,
                users: list.users.map(user => {
                    const data = {
                        ...user,
                        ...foundUsers[user.cid] ?? {
                            type: 'offline',
                            data: undefined,
                        },
                    } as UserListLiveUser;

                    if (user.private) {
                        if (this.user?.isSup) data.hidden = true;
                        else {
                            data.hidden = data.type !== 'offline';
                            data.type = 'offline';
                        }
                    }

                    return data;
                }).sort((a, b) => {
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
        userMessages(): PartialRecord<UserMessageType, UserMessage> {
            if (!this.user) return {};
            return Object.fromEntries(this.user.messages.map(x => ([x.message, x])));
        },
        getEvents(): VatsimActiveEvent[] {
            return this.events.filter(x => new Date(x.end_time).getTime() < useDataStore().time.value);
        },
        eventsMap(): Record<string, VatsimActiveEvent> {
            const icaoMap: Record<string, VatsimActiveEvent> = {};

            for (const event of this.getEvents) {
                for (const { icao } of event.airports) {
                    if (icaoMap[icao]) continue;
                    icaoMap[icao] = event;
                }
            }

            return icaoMap;
        },
    },
    actions: {
        async getVATSIMData(force = false, onFetch?: () => any) {
            if (this.dataInProgress) return;

            const dataStore = useDataStore();
            const config = useRuntimeConfig();

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
                        await clientDB.simaware.get('version') && dataStore.vatspy.value?.version &&
                        (
                            (dataStore.vatglasses.value && dataStore.versions.value.vatglasses !== dataStore.vatglasses.value) ||
                            dataStore.versions.value.simaware !== await clientDB.simaware.get('version') ||
                            dataStore.versions.value.vatspy !== dataStore.vatspy.value?.version
                        )
                    ) location.reload();
                }

                if (force || !dataStore.vatsim._mandatoryData.value || (!versions || versions.data !== dataStore.vatsim.updateTimestamp.value)) {
                    if (!dataStore.vatsim.data) dataStore.vatsim.data = {} as any;

                    const data = await $fetch<VatsimLiveCompactData | VatsimLiveCompactDataShort>(`/api/data/vatsim/data/compact${ dataStore.vatsim.data.general.value?.unique_users ? '/short' : '' }`, {
                        timeout: 1000 * 60,
                    });
                    await setVatsimDataStore(data);
                    dataStore.vatsim.shortUpdateTime.value = Date.now();

                    if (force || String(config.public.DISABLE_WEBSOCKETS) === 'true' || getKeyedValueFromSettings('map.traffic.disableFastUpdate') || !dataStore.vatsim.mandatoryData.value) {
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

            const validation = await $fetch<{ status: 'ok' }>(`/api/user/${ prefix }/validate`, {
                method: 'POST',
                body: 'id' in json
                    ? json
                    : {
                        json,
                    },
            });

            if (validation.status === 'ok') saveResult();
        },
        async fetchFiltersPresets() {
            this.filterPresets = await $fetch<UserFilterPreset[]>('/api/user/filters');
        },
        async fetchBookmarks() {
            this.bookmarks = await $fetch<UserFilterPreset[]>('/api/user/bookmarks');
        },
        addNotification(notification: LocalNotification) {
            notification.id = Date.now();
            this.localNotifications.push(notification);

            setTimeout(() => {
                this.localNotifications = this.localNotifications.filter(x => x.id !== notification.id);
            }, notification.timeout);

            return notification;
        },
        addError(text: string, timeout = 5000) {
            console.log(this.addNotification({
                type: 'error',
                text,
                timeout,
            }));
        },
        setActiveFilter(val: boolean) {
            isFilterActive().value.value = val;
            this.isFilterActive = val;
        },
    },
});
