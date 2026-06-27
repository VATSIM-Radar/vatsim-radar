<template>
    <div
        v-if="dashboard"
        class="dashboard-view"
    >
        <div class="dashboard-view_header">
            <div class="dashboard-view_header_title">
                <div class="dashboard-view_header_title_name">
                    {{ dashboard.name }}
                </div>
                <div
                    v-if="dashboard.public && dashboard.id !== -1 && !dashboard.owner && store.user"
                    class="dashboard-view_header_title_favorite"
                    @click="toggleFavorite"
                >
                    <star-filled-icon v-if="store.favoriteDashboards.some(x => x.id === dashboard?.id)"/>
                    <star-icon v-else/>
                </div>

                <ui-button
                    size="S"
                    type="secondary"
                    @click="onCopyLink"
                >
                    <template #icon>
                        <copy-icon/>
                    </template>
                    {{ copyState ? 'Copied!' : 'Copy link' }}
                </ui-button>

                <div class="dashboard-view_actions">
                    <ui-button
                        size="S"
                        type="secondary"
                        @click="actionsOpen = !actionsOpen"
                    >
                        <template #icon>
                            <settings-icon/>
                        </template>
                        Actions
                    </ui-button>

                    <div
                        v-if="actionsOpen"
                        _
                        class="dashboard-view_actions_backdrop"
                        @click="actionsOpen = false"
                    />

                    <div
                        v-if="actionsOpen"
                        class="dashboard-view_actions_menu"
                    >
                        <ui-button
                            v-if="dashboard.owner"
                            size="S"
                            type="link"
                            @click="openEditor"
                        >
                            Edit dashboard
                        </ui-button>

                        <div
                            v-if="confirmPublic"
                            class="dashboard-view_actions_confirm"
                        >
                            <span>Make this dashboard public so it can be shared?</span>
                            <div class="dashboard-view_actions_confirm_buttons">
                                <ui-button
                                    size="S"
                                    @click="makePublicAndShare"
                                >
                                    Make public &amp; copy
                                </ui-button>
                                <ui-button
                                    size="S"
                                    type="secondary"
                                    @click="confirmPublic = false"
                                >
                                    Cancel
                                </ui-button>
                            </div>
                        </div>

                        <div class="dashboard-view_actions_divider"/>

                        <ui-toggle v-model="arrivalTracksModel">
                            Arrival tracks
                        </ui-toggle>

                        <label class="dashboard-view_actions_field">
                            <span>Enroute position override</span>
                            <ui-input-text
                                v-model="enrouteCallsignModel"
                                placeholder="e.g. UUWV_CTR"
                            />
                        </label>

                        <label class="dashboard-view_actions_field">
                            <span>Map aircraft override</span>
                            <ui-select
                                :items="dashboardAircraftModes"
                                :model-value="aircraftModeModel"
                                width="100%"
                                @update:modelValue="aircraftModeModel = $event as MapAircraftMode"
                            />
                        </label>

                        <label class="dashboard-view_actions_field">
                            <span>Enroute flight level override</span>
                            <div class="dashboard-view_actions_fl">
                                <ui-input-number
                                    height="32px"
                                    :model-value="flFrom"
                                    placeholder="From"
                                    @update:modelValue="value => {
                                        flFrom = value; applyFlOverride();
                                    }"
                                />
                                <ui-input-number
                                    height="32px"
                                    :model-value="flTo"
                                    placeholder="To"
                                    @update:modelValue="value => {
                                        flTo = value; applyFlOverride();
                                    }"
                                />
                            </div>
                        </label>
                    </div>
                </div>
                <ui-button
                    size="S"
                    type="secondary"
                    @click="openWeatherRequest"
                >
                    <template #icon>
                        <weather-icon/>
                    </template>
                    Conditions Request
                </ui-button>
                <ui-button
                    v-if="dashboard?.id === -1"
                    size="S"
                    :to="`/dashboard?new=1&airport=${ id.toUpperCase() }`"
                    type="secondary"
                >
                    <template #icon>
                        <data-icon/>
                    </template>
                    Create Dashboard
                </ui-button>
                <ui-button
                    size="S"
                    type="secondary"
                    @click="mapKey++"
                >
                    Refresh Map
                </ui-button>
            </div>
            <client-only>
                <div class="dashboard-view_header_aside">
                    <div class="dashboard-view_header_clock">
                        {{ utcTime }}<span class="dashboard-view_header_clock_z">z</span>
                    </div>
                </div>
            </client-only>
            <div v-if="settings?.showMetar" class="dashboard-view_header_weather">
                <dashboard-weather
                    :can-edit="dashboard.owner"
                />
            </div>
        </div>

        <div
            class="dashboard-view_body"
            :class="`dashboard-view_body--${ mapLocation }`"
            :style="{ '--map-size': mapBasis }"
        >
            <div
                v-if="showPanel"
                class="dashboard-view_panel"
            >
                <div class="dashboard-view_section">
                    <dashboard-aircraft
                        v-if="ready"
                        v-model:selected="selectedPilot"
                    />
                </div>

                <div class="dashboard-view_section">
                    <dashboard-prediction v-if="ready"/>
                </div>
            </div>

            <div
                v-if="showMap"
                :key="store.theme"
                class="dashboard-view_map"
            >
                <iframe
                    v-if="ready && mounted"
                    :key="mapKey"
                    ref="mapFrame"
                    class="dashboard-view_map_iframe"
                    :src="mapSrc"
                />
            </div>
        </div>

        <dashboard-edit-popup
            v-if="dashboard.owner"
            v-model="editorOpen"
            :edit-dashboard="editDashboardForPopup"
            @saved="onSaved"
        />
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { updateDashboard } from '~/composables/fetchers/dashboards';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import DashboardWeather from '~/components/features/dashboard/DashboardWeather.vue';
import DashboardAircraft from '~/components/features/dashboard/DashboardAircraft.vue';
import DashboardPrediction from '~/components/features/dashboard/DashboardPrediction.vue';
import DashboardEditPopup from '~/components/features/dashboard/DashboardEditPopup.vue';
import type { PublicDashboard, UserDashboard } from '~/utils/server/handlers/dashboards';
import type { StoreOverlayAirport } from '~/store/map';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import SettingsIcon from '@/assets/icons/kit/settings.svg?component';
import CopyIcon from '@/assets/icons/kit/copy.svg?component';
import WeatherIcon from '@/assets/icons/kit/weather.svg?component';
import StarIcon from '~/assets/icons/kit/star.svg?component';
import StarFilledIcon from '~/assets/icons/kit/star-filled.svg?component';
import { useDataStore } from '~/composables/render/storage';
import { checkForUpdates, checkForVATSpy } from '~/composables/init';
import { dashboardAircraftModes, dashboardColumns } from '~/utils/shared/dashboard';
import type { MapAircraftMode } from '~/types/map';
import DataIcon from 'assets/icons/kit/data.svg?component';

const route = useRoute();
const router = useRouter();
const store = useStore();
const dataStore = useDataStore();
const config = useRuntimeConfig();
const id = computed(() => route.params.id as string);
const mapKey = ref(0);

const { data: dashboard, refresh: refreshDashboard } = await useAsyncData(`dashboard-${ toValue(id) }`, async () => {
    try {
        if (isNaN(Number(id.value))) {
            if (!useDataStore().vatspy.value) {
                await checkForUpdates();
                await checkForVATSpy();
            }

            const icao = id.value.toUpperCase();

            if (dataStore.vatspy.value?.data.keyAirports.realIcao[icao]) {
                return {
                    id: -1,
                    name: icao,
                    public: true,
                    json: {
                        airports: [
                            {
                                icao,
                                showInTrafficPrediction: true,
                            },
                        ],
                        mapLocation: 'right',
                        mapSize: 50,
                        displayMode: 'both',
                        showMetar: true,
                        showArrivalTracks: true,
                        openColumns: [...dashboardColumns],
                        aircraftMode: 'all',
                    },
                    createdAt: new Date(),
                    owner: false,
                } satisfies PublicDashboard as PublicDashboard;
            }
            else {
                seenDashboards.value = seenDashboards.value.filter(x => x.id !== id.value && x.name).slice(0, 5);
                await nextTick();
                showError({
                    status: 404,
                });
                return null;
            }
        }

        return await $fetch<PublicDashboard>(`/api/data/dashboard/${ id.value }`);
    }
    catch (e) {
        const error = e as { statusCode?: number; response?: { status?: number }; data?: unknown };
        seenDashboards.value = seenDashboards.value.filter(x => x.id !== id.value && x.name).slice(0, 5);
        await nextTick();
        showError({
            status: error?.statusCode ?? error?.response?.status ?? 500,
            statusText: typeof error?.data === 'string' ? error.data : undefined,
        });
        return null;
    }
}, {
    server: false,
});

const { refresh: refreshFavorite } = await useAsyncData(store.fetchFavoriteDashboards, {
    server: false,
});

const airportsData = shallowRef<Record<string, StoreOverlayAirport['data']>>({});
provide('dashboard-airports-data', airportsData);

onBeforeUnmount(() => {
    store.activeDashboard = null;
});

const settings = computed(() => dashboard.value?.json ?? null);
const airportIcaos = computed(() => settings.value?.airports.map(airport => airport.icao) ?? []);

const mapLocation = computed(() => settings.value?.mapLocation ?? 'right');
const mapSize = computed(() => settings.value?.mapSize ?? 100);
const displayMode = computed(() => settings.value?.displayMode ?? 'both');

const showMap = computed(() => displayMode.value !== 'aircraft');
const showPanel = computed(() => displayMode.value !== 'map');
const effectiveMapSize = computed(() => (mapSize.value >= 100 ? 50 : mapSize.value));
const mapBasis = computed(() => ((showPanel.value && showMap.value) ? `${ effectiveMapSize.value }%` : '100%'));

function setQueryParam(key: string, value: string | undefined) {
    const query = { ...route.query };
    if (value === undefined || value === '') delete query[key];
    else query[key] = value;
    router.replace({ query });
}

const tracksOverride = computed<boolean | null>(() => {
    const query = route.query.tracks;
    if (query === '1') return true;
    if (query === '0') return false;
    return null;
});
const arrivalTracks = computed(() => tracksOverride.value ?? settings.value?.showArrivalTracks ?? true);
const arrivalTracksModel = computed({
    get: () => arrivalTracks.value,
    set: value => setQueryParam('tracks', value ? '1' : '0'),
});

const enrouteCallsign = computed(() => {
    const query = route.query.enroute;
    if (typeof query === 'string' && query.trim()) return query.toUpperCase();
    return settings.value?.enrouteCallsign ?? null;
});
const enrouteCallsignModel = computed({
    get: () => (typeof route.query.enroute === 'string' ? route.query.enroute : settings.value?.enrouteCallsign ?? ''),
    set: value => setQueryParam('enroute', value ? value.toUpperCase().trim() : undefined),
});

const aircraftMode = computed<MapAircraftMode>(() => {
    const query = route.query.aircraft;
    if (typeof query === 'string' && dashboardAircraftModes.some(mode => mode.value === query)) return query as MapAircraftMode;
    return settings.value?.aircraftMode ?? 'all';
});
const aircraftModeModel = computed({
    get: () => aircraftMode.value,
    set: value => setQueryParam('aircraft', value === (settings.value?.aircraftMode ?? 'all') ? undefined : value),
});

const enrouteFlightLevel = computed<{ from: number; to: number } | null>(() => {
    const query = route.query.fl;
    if (typeof query === 'string' && /^\d+-\d+$/.test(query)) {
        const [from, to] = query.split('-').map(Number);
        if (from <= to) return { from, to };
    }
    return settings.value?.enrouteFlightLevel ?? null;
});

provide('dashboard-overrides', computed(() => ({
    arrivalTracks: arrivalTracks.value,
    enrouteCallsign: enrouteCallsign.value,
    enrouteFlightLevel: enrouteFlightLevel.value,
})));

const mapSrc = computed(() => {
    const params = new URLSearchParams();

    params.set('preset', 'dashboard');
    params.set('airports', airportIcaos.value.join(','));
    params.set('tracks', Number(arrivalTracks.value).toString());
    params.set('airportMode', aircraftMode.value);
    params.set('dashboard', id.value);

    if (settings.value?.enrouteCallsign) params.set('atcCallsign', settings.value.enrouteCallsign);

    return `/?${ params.toString() }`;
});

useHead(() => ({
    title: dashboard.value?.name ?? 'Dashboard',
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }/dashboard/${ id.value }`,
        },
    ],
}));

const seenDashboards = useLocalStorage<{ name: string; id: string }[]>('seen-dashboards', []);

const ready = ref(false);
const mounted = ref(false);
const mapFrame = ref<HTMLIFrameElement | null>(null);

const selectedPilot = ref<number | null>(null);
let skipSelectedPilotWatch = false;

function receiveMessage(event: MessageEvent) {
    if (event.origin !== config.public.DOMAIN || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return;
    if ('selectedPilot' in event.data && selectedPilot.value !== event.data.selectedPilot) {
        selectedPilot.value = event.data.selectedPilot;
        skipSelectedPilotWatch = true;
    }
}

watch(selectedPilot, () => {
    if (skipSelectedPilotWatch) {
        skipSelectedPilotWatch = false;
        return;
    }
    mapFrame.value?.contentWindow?.postMessage({ selectedPilot: selectedPilot.value }, config.public.DOMAIN);
});

const utcTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});
const now = ref(new Date());
const utcTime = computed(() => utcTimeFormatter.format(now.value));
let clockInterval: NodeJS.Timeout | undefined;
let weatherInterval: NodeJS.Timeout | undefined;

onMounted(() => {
    mounted.value = true;
    clockInterval = setInterval(() => {
        now.value = new Date();
    }, 1000);
    weatherInterval = setInterval(refreshWeather, 1000 * 60 * 5);
    window.addEventListener('message', receiveMessage);
    store.activeDashboard = dashboard.value?.json ?? null;
});

onBeforeUnmount(() => {
    clearInterval(clockInterval);
    clearInterval(weatherInterval);
    window.removeEventListener('message', receiveMessage);
});

provide('dashboard', dashboard);

watch(dashboard, async value => {
    store.activeDashboard = value?.json ?? null;
    seenDashboards.value = seenDashboards.value.filter(x => x.id !== id.value && x.name).slice(0, 5);
    if (!value) return;

    seenDashboards.value.unshift({ id: id.value, name: dashboard.value?.name ?? '' });

    airportsData.value = await fetchAirportsWeather();
    triggerRef(airportsData);
}, { immediate: true, deep: true });

await setupDataFetch({
    onSuccessCallback() {
        ready.value = true;
    },
});

const actionsOpen = ref(false);
const confirmPublic = ref(false);
const { copy, copyState } = useCopyText();

const editorOpen = ref(false);
const editDashboardForPopup = computed(() => (dashboard.value ? (dashboard.value as unknown as UserDashboard) : null));

function openEditor() {
    actionsOpen.value = false;
    editorOpen.value = true;
}

function openWeatherRequest() {
    store.metarRequest = [...airportIcaos.value];
}

function shareLink() {
    return copy(`${ config.public.DOMAIN }/dashboard/${ id.value }`);
}

async function toggleFavorite() {
    const favorite = store.favoriteDashboards.find(x => x.id === dashboard.value?.id);

    await $fetch(`/api/user/dashboards/favorite/${ dashboard.value?.id }`, {
        method: favorite ? 'DELETE' : 'POST',
    });

    await refreshFavorite();
}

async function makePublicAndShare() {
    if (!dashboard.value) return;
    await updateDashboard(dashboard.value.id, {
        name: dashboard.value.name,
        public: true,
        json: dashboard.value.json,
    });
    dashboard.value = { ...dashboard.value, public: true };
    confirmPublic.value = false;
    await shareLink();
}

async function onCopyLink() {
    if (dashboard.value?.public) {
        await shareLink();
        return;
    }
    actionsOpen.value = true;
    confirmPublic.value = true;
}

async function onSaved() {
    editorOpen.value = false;
    await refreshDashboard();
    await refreshWeather();
}

const flFrom = ref<number | null>(toValue(enrouteFlightLevel)?.from ?? null);
const flTo = ref<number | null>(toValue(enrouteFlightLevel)?.to ?? null);

function applyFlOverride() {
    if (flFrom.value != null && flTo.value != null && flFrom.value <= flTo.value) {
        setQueryParam('fl', `${ flFrom.value }-${ flTo.value }`);
    }
    else {
        setQueryParam('fl', undefined);
    }
}

async function fetchAirportsWeather() {
    const icaos = airportIcaos.value;
    if (!icaos.length) return {} as Record<string, StoreOverlayAirport['data']>;

    const entries = await Promise.all(icaos.map(async (icao): Promise<[string, StoreOverlayAirport['data']]> => {
        try {
            const airport = await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ icao }`);
            return [icao, { icao, airport, notams: [], showTracks: false }];
        }
        catch {
            return [icao, { icao, notams: [], showTracks: false }];
        }
    }));

    return Object.fromEntries(entries) as Record<string, StoreOverlayAirport['data']>;
}

async function refreshWeather() {
    airportsData.value = await fetchAirportsWeather();
}
</script>

<style scoped lang="scss">
.dashboard-view {
    display: flex;
    flex-direction: column;
    gap: 16px;

    height: calc(100dvh - 120px);
    margin: 16px;

    @include mobileOnly {
        height: auto;
    }

    &_header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        align-items: center;
        justify-content: space-between;

        &_title {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;

            font-size: 16px;
            line-height: 100%;

            &_name {
                font-weight: 600;
                color: $blue500;
            }

            &_favorite {
                cursor: pointer;

                svg {
                    width: 12px;
                }
            }
        }

        &_aside {
            display: flex;
            gap: 16px;
            align-items: center;
        }

        &_clock {
            font-family: $juraFont;
            font-size: 24px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: $lightGray200;
            letter-spacing: 1px;

            &_z {
                color: $lightGray500;
            }
        }

        &_weather {
            width: 100%;
        }
    }

    &_actions {
        position: relative;

        &_backdrop {
            position: fixed;
            z-index: 5;
            inset: 0;
        }

        &_menu {
            position: absolute;
            z-index: 6;
            top: calc(100% + 8px);
            left: 0;

            display: flex;
            flex-direction: column;
            gap: 12px;

            width: 280px;
            max-width: 90vw;
            padding: 16px;
            border: 1px solid $darkGray800;
            border-radius: 8px;

            background: $darkGray900;
            box-shadow: 0 8px 24px rgb(0 0 0 / 40%);
        }

        &_confirm {
            display: flex;
            flex-direction: column;
            gap: 8px;

            padding: 8px;
            border-radius: 6px;

            font-size: 12px;
            color: $lightGray200;

            background: $darkGray800;

            &_buttons {
                display: flex;
                gap: 8px;
            }
        }

        &_divider {
            height: 1px;
            background: $darkGray700;
        }

        &_field {
            display: flex;
            flex-direction: column;
            gap: 6px;

            font-size: 12px;
            color: $lightGray500;
        }

        &_fl {
            display: flex;
            gap: 8px;
        }
    }

    &_body {
        display: flex;
        flex: 1 1 auto;
        gap: 16px;
        min-height: 0;

        &--right {
            flex-direction: row;
        }

        &--left {
            flex-direction: row-reverse;
        }

        &--below {
            flex-direction: column;
        }

        &--above {
            flex-direction: column-reverse;
        }

        @include mobileOnly {
            flex-direction: column;
            min-height: 100dvh;
        }
    }

    &_panel {
        scrollbar-gutter: stable;

        overflow: auto;
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        gap: 12px;

        min-width: 0;
        min-height: 0;
    }

    &_section {
        background: $black;

        &_title {
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 700;
            color: $lightGray500;
        }
    }


    &_map {
        overflow: hidden;
        display: flex;
        flex: 0 0 var(--map-size);

        min-width: 0;
        min-height: 0;

        &_iframe {
            all: unset;

            overflow: hidden;

            width: 100%;
            height: 100%;
            border-radius: 8px;
        }

        @include mobileOnly {
            position: relative;
            flex-grow: 1;
            min-height: 320px;

            &_iframe {
                position: absolute;
                inset: 0;
            }
        }
    }
}
</style>
