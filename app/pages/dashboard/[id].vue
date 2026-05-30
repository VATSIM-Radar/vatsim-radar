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
                <ui-bubble
                    v-if="dashboard.public"
                    class="dashboard-view_header_title_badge"
                >
                    Public
                </ui-bubble>

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
                    Weather Request
                </ui-button>
            </div>
            <div class="dashboard-view_header_aside">
                <div class="dashboard-view_header_clock">
                    {{ utcTime }}<span class="dashboard-view_header_clock_z">z</span>
                </div>
            </div>
            <div class="dashboard-view_header_weather">
                <dashboard-weather
                    :can-edit="dashboard.owner"
                    @addAirport="openEditor"
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
                    <div class="dashboard-view_section_title">
                        Aircraft
                    </div>
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
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import DashboardWeather from '~/components/features/dashboard/DashboardWeather.vue';
import DashboardAircraft from '~/components/features/dashboard/DashboardAircraft.vue';
import DashboardPrediction from '~/components/features/dashboard/DashboardPrediction.vue';
import DashboardEditPopup from '~/components/features/dashboard/DashboardEditPopup.vue';
import type { PublicDashboard, UserDashboard } from '~/utils/server/handlers/dashboards';
import type { StoreOverlayAirport } from '~/store/map';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/utils/server/notams';
import SettingsIcon from '@/assets/icons/kit/settings.svg?component';
import CopyIcon from '@/assets/icons/kit/copy.svg?component';
import WeatherIcon from '@/assets/icons/kit/weather.svg?component';

const route = useRoute();
const router = useRouter();
const store = useStore();
const config = useRuntimeConfig();
const requestFetch = useRequestFetch();

const id = computed(() => route.params.id as string);

const dashboard = shallowRef<PublicDashboard | null>(null);
provide('dashboard', dashboard);

const airportsData = shallowRef<Record<string, StoreOverlayAirport['data']>>({});
provide('dashboard-airports-data', airportsData);

watch(dashboard, value => {
    store.activeDashboard = value?.json ?? null;
}, { immediate: true });

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

const mapSrc = computed(() => `/?preset=dashboard&airports=${ airportIcaos.value.join(',') }&tracks=${ Number(arrivalTracks.value) }`);

useHead(() => ({
    title: dashboard.value?.name ?? 'Dashboard',
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }/dashboard/${ id.value }`,
        },
    ],
}));

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
});

onBeforeUnmount(() => {
    clearInterval(clockInterval);
    clearInterval(weatherInterval);
    window.removeEventListener('message', receiveMessage);
});

const { data, refresh: refreshDashboard } = await useAsyncData(`dashboard-${ toValue(id) }`, async () => {
    try {
        return await requestFetch<PublicDashboard>(`/api/data/dashboard/${ id.value }`);
    }
    catch (e) {
        const error = e as { statusCode?: number; response?: { status?: number }; data?: unknown };
        showError({
            statusCode: error?.statusCode ?? error?.response?.status ?? 500,
            statusMessage: typeof error?.data === 'string' ? error.data : undefined,
        });
        return null;
    }
});

dashboard.value = data.value ?? null;

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
    dashboard.value = data.value ?? dashboard.value;
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
    const next = await fetchAirportsWeather();
    for (const [icao, entry] of Object.entries(next)) {
        const existing = airportsData.value[icao];
        if (entry && existing?.notams?.length) entry.notams = existing.notams;
    }
    airportsData.value = next;
}

if (toValue(dashboard)) {
    const { data: weatherData } = await useAsyncData(`dashboard-weather-${ toValue(id) }`, fetchAirportsWeather, {
        default: () => ({}),
    });
    airportsData.value = weatherData.value ?? {};

    useLazyAsyncData(`dashboard-notams-${ toValue(id) }`, async () => {
        await Promise.all(airportIcaos.value.map(async icao => {
            const notams = await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ icao }/notams`).catch(() => null);
            const entry = airportsData.value[icao];
            if (notams && entry) entry.notams = notams;
        }));
        triggerRef(airportsData);
        return true;
    }, { server: false });

    await setupDataFetch({
        onSuccessCallback() {
            ready.value = true;
        },
    });
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
            gap: 8px;
            align-items: center;

            font-size: 16px;
            line-height: 100%;

            &_name {
                font-weight: 600;
                color: $blue500;
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
        padding: 12px;
        border: 1px solid $darkGray800;
        border-radius: 8px;
        background: $black;

        &_title {
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 700;
            color: $lightGray500;
        }
    }


    &_map {
        display: flex;
        flex: 0 0 var(--map-size);
        min-width: 0;
        min-height: 0;

        @include mobileOnly {
            min-height: 320px;
        }

        &_iframe {
            all: unset;

            overflow: hidden;

            width: 100%;
            height: 100%;
            border-radius: 8px;
        }
    }
}
</style>
