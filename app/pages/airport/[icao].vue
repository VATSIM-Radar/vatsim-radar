<template>
    <div
        v-if="airportData"
        class="airport"
        :style="{
            '--dashboard-height': mapLayouts[mapMode ?? 'default'].dash,
            '--map-height': mapLayouts[mapMode ?? 'default'].map,
        }"
    >
        <div class="airport_header">
            <div class="airport_header_section">
                <div class="airport_header__title">
                    <div class="airport_header__title_label">
                        Airport
                    </div>
                    <div class="airport_header__title_name">
                        {{ icao }}
                    </div>
                    <div class="airport_header__title_refresh">
                        <ui-button
                            :disabled="loadingData"
                            icon-width="16px"
                            title="Refresh weather / NOTAMs"
                            type="link"
                            @click="refreshData"
                        >
                            <template #icon>
                                <rotate-clockwise/>
                            </template>
                        </ui-button>
                    </div>
                </div>
            </div>
            <div class="airport_header_section">
                <ui-select
                    v-model="aircraftMode"
                    :items="dashboardAircraftModes"
                    placeholder="Filter Map Aircraft"
                    width="200px"
                />
            </div>
            <div class="airport_header_section">
                <ui-select
                    v-model="mapMode"
                    :items="mapModes"
                    placeholder="Page Layout"
                    width="200px"
                />
            </div>
            <div class="airport_header_section">
                <ui-toggle v-model="arrivalTracks">
                    Arrival Tracks
                </ui-toggle>
            </div>
            <div class="airport_header_section">
                <ui-button
                    size="S"
                    :to="`/dashboard/${ icao }`"
                    type="secondary"
                >
                    Open Dashboard
                </ui-button>
            </div>
            <div class="airport_header_section">
                <ui-button
                    size="S"
                    type="secondary"
                    @click="mapKey++"
                >
                    Refresh map
                </ui-button>
            </div>
        </div>
        <div class="airport_sections">
            <div class="airport_column">
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        <ui-tabs
                            v-model="airportTab"
                            :tabs="{ info: { title: 'Airport Info', disabled: !airportData?.airport?.vatInfo }, proc: { title: 'Procedures' } }"
                        />
                    </div>
                    <airport-info v-if="airportTab === 'info' && airportData?.airport?.vatInfo"/>
                    <airport-procedures
                        v-else-if="ready && airportTab === 'proc'"
                        :airport="airportData.icao"
                        from="dashboard"
                    />
                </div>
                <div
                    v-if="airportData?.airport?.metar || airportData?.airport?.taf"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        <ui-tabs
                            v-model="weatherTab"
                            :tabs="{ metar: { title: 'METAR' }, taf: { title: 'TAF' } }"
                        />
                    </div>

                    <airport-metar v-if="weatherTab === 'metar'"/>
                    <airport-taf v-else/>
                </div>
            </div>
            <div
                v-if="airportData.notams?.length"
                class="airport_column"
            >
                <div
                    v-if="airportData?.notams?.length"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        NOTAMS
                    </div>
                    <airport-notams/>
                </div>
            </div>
            <div
                v-if="atc.length || !ready"
                class="airport_column"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        <div class="airport_column__title_text">
                            Active Controllers
                        </div>
                        <ui-bubble class="airport_column__title_aside">
                            {{ atc.length }}
                        </ui-bubble>
                    </div>
                    <airport-controllers v-if="ready"/>
                </div>
            </div>
            <div
                v-if="!ready || (aircraft && Object.values(aircraft).some(x => x.length))"
                class="airport_column airport_column--aircraft"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        Aircraft
                    </div>
                    <airport-aircraft
                        v-if="ready"
                        filter-relative-to-aircraft
                        in-dashboard
                    />
                </div>
            </div>
        </div>
        <div
            v-if="mapLayouts[mapMode ?? 'default'].map !== '0'"
            :key="store.theme"
            class="airport_map"
        >
            <iframe
                v-if="ready && mounted"
                :key="mapKey"
                ref="airportMapFrame"
                class="airport_map_iframe"
                :src="`/?preset=dashboard&airport=${ icao }&airportMode=${ aircraftMode ?? 'all' }&zoom=${ savedZoom }&tracks=${ Number(arrivalTracks) }&airportAircraft=1`"
            />
            <transition name="airport_map_pilot--appear">
                <airport-pilot
                    v-if="selectedPilot && !isMobileOrTablet"
                    :key="selectedPilot"
                    :cid="selectedPilot"
                    class="airport_map_pilot"
                    @update:modelValue="selectedPilot = null"
                />
            </transition>
        </div>
        <popup-fullscreen
            v-if="(mapLayouts[mapMode ?? 'default'].map === '0' || isMobileOrTablet) && selectedPilot"
            disabled
            :model-value="!!selectedPilot"
            @update:modelValue="!$event && (selectedPilot = null)"
        >
            <airport-pilot
                :cid="selectedPilot"
                class="airport_map_pilot airport_map_pilot--popup"
                @update:modelValue="selectedPilot = null"
            />
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import AirportInfo from '~/components/features/vatsim/airport/AirportInfo.vue';
import { getAircraftForAirport, getATCForAirport, provideAirport } from '~/composables/vatsim/airport';
import type { StoreOverlayAirport } from '~/store/map';
import AirportMetar from '~/components/features/vatsim/airport/AirportMetar.vue';
import AirportTaf from '~/components/features/vatsim/airport/AirportTaf.vue';
import AirportNotams from '~/components/features/vatsim/airport/AirportNotams.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import type { Ref } from 'vue';
import AirportAircraft from '~/components/features/vatsim/airport/AirportAircraft.vue';
import AirportControllers from '~/components/features/vatsim/airport/AirportControllers.vue';
import { useStore } from '~/store';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import type { SelectItem } from '~/types/components/select';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import type { MapAircraftMode } from '~/types/map';
import AirportPilot from '~/components/features/vatsim/airport/AirportPilot.vue';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import { useRadarError } from '~/composables/errors';
import AirportProcedures from '~/components/features/vatsim/airport/AirportProcedures.vue';
import { updateCachedProcedures } from '~/composables/navigraph';
import RotateClockwise from '@/assets/icons/kit/rotate-clockwise.svg?component';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { VatsimAirportDataNotam } from '~/utils/server/notams';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import { dashboardAircraftModes } from '~/utils/shared/dashboard';

const route = useRoute();
const router = useRouter();
const store = useStore();
const dataStore = useDataStore();
const mounted = ref(false);
const config = useRuntimeConfig();
const mapKey = ref(0);

const icao = computed(() => (route.params.icao as string)?.toUpperCase());
const airport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[icao.value]);
const airportData = shallowRef<StoreOverlayAirport['data'] | null>(null);
provideAirport(airportData as Ref<StoreOverlayAirport['data']>);

const atc = getATCForAirport(airportData as Ref<StoreOverlayAirport['data']>);
const aircraft = getAircraftForAirport(airportData as Ref<StoreOverlayAirport['data']>);

useHead(() => ({
    title: icao,
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }/airport/${ icao.value }`,
        },
    ],
}));

const airportTab = ref('info');
const weatherTab = ref('metar');

const selectedPilot = ref<number | null>(null);
const ready = ref(false);

const mapQuery = shallowRef<null | Record<string, any>>(null);
const savedZoom = shallowRef<null | string>(null);

const airportMapFrame = ref<HTMLIFrameElement | null>(null);
let skipSelectedPilotWatch = false;
function receiveMessage(event: MessageEvent) {
    if (event.origin !== config.public.DOMAIN || (!event.data || typeof event.data !== 'object' || Array.isArray(event.data))) {
        return;
    }
    if (event.data && 'selectedPilot' in event.data) {
        if (selectedPilot.value !== event.data.selectedPilot) {
            selectedPilot.value = event.data.selectedPilot;
            skipSelectedPilotWatch = true; // the change in the line above will trigger the watch of selectedPilot. But here in this function we have received the change from the iframe, so we need to skip the watch, because we don't need to send a message back to the iframe
        }
    }

    if (event.data && event.data.type === 'move') {
        mapQuery.value = event.data.query;
    }
}

onMounted(() => {
    window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
    window.removeEventListener('message', receiveMessage);
});

watch(selectedPilot, async () => {
    if (skipSelectedPilotWatch) {
        skipSelectedPilotWatch = false;
        return;
    }
    if (aircraft.value?.prefiles.find(x => x.cid === selectedPilot.value)) return; // we can not show prefiles on the map, because they are not connected

    if (airportMapFrame.value) {
        const iframeWindow = airportMapFrame.value.contentWindow;
        const message = { selectedPilot: selectedPilot.value ?? null };
        const targetOrigin = config.public.DOMAIN;
        iframeWindow?.postMessage(message, targetOrigin);
    }
});

const aircraftMode = ref<MapAircraftMode | null>(null);

watch(() => dataStore.navigraphProcedures.value[airportData.value?.icao ?? ''], async () => {
    if (airportMapFrame.value) {
        await sleep(1000);
        const iframeWindow = airportMapFrame.value.contentWindow;
        const message = { proceduresUpdate: true };
        const targetOrigin = config.public.DOMAIN;
        iframeWindow?.postMessage(message, targetOrigin);
    }
}, {
    deep: 3,
});

type MapMode = 'default' | 'dashBigMapBig' | 'dashSmallMapBig' | 'dashBigMapSmall' | 'dashOnly' | 'mapOnly';
const mapMode = useCookie<MapMode | null>('dashboard-map-mode', {
    sameSite: 'none',
    secure: true,
    watch: false,
    default: () => null,
    path: '/',
});

const isMobileOrTablet = useIsMobileOrTablet();

function calculateMapLayout(height: number, type: 'dash' | 'map' | 'default' | 'alone') {
    if (height === 0) return '0';

    if (isMobileOrTablet.value) return `${ height }vh`;

    let calculatedHeight = `calc(${ height }vh`;
    if (type === 'dash') calculatedHeight += ` - (32px + 56px) - 40px - 16px)`;
    else if (type === 'map') calculatedHeight += ` - 16px)`;
    else if (type === 'alone') calculatedHeight += ` - (32px + 56px) - 16px)`;
    else calculatedHeight += ')';

    return calculatedHeight;
}

const mapLayouts: Record<MapMode, { dash: string; map: string }> = {
    default: {
        dash: calculateMapLayout(60, 'dash'),
        map: calculateMapLayout(40, 'map'),
    },
    dashBigMapBig: {
        dash: calculateMapLayout(80, 'default'),
        map: calculateMapLayout(80, 'default'),
    },
    dashSmallMapBig: {
        dash: calculateMapLayout(30, 'dash'),
        map: calculateMapLayout(70, 'map'),
    },
    dashBigMapSmall: {
        dash: calculateMapLayout(70, 'dash'),
        map: calculateMapLayout(30, 'map'),
    },
    dashOnly: {
        dash: calculateMapLayout(90, 'alone'),
        map: calculateMapLayout(0, 'map'),
    },
    mapOnly: {
        dash: calculateMapLayout(0, 'dash'),
        map: calculateMapLayout(90, 'alone'),
    },
};

const mapModes: SelectItem<MapMode>[] = [
    {
        value: 'default',
        text: 'Default',
    },
    {
        value: 'dashSmallMapBig',
        text: 'Large map',
    },
    {
        value: 'dashBigMapSmall',
        text: 'Large info',
    },
    {
        value: 'dashOnly',
        text: 'Info only',
    },
    {
        value: 'mapOnly',
        text: 'Map only',
    },
    {
        value: 'dashBigMapBig',
        text: 'Both large',
    },
];

const arrivalTracks = useCookie<boolean>('controller-arrival-tracks', {
    sameSite: 'none',
    secure: true,
    default: () => false,
    watch: false,
    path: '/',
});

const settings = computed(() => ({
    zoom: mapQuery.value?.zoom,
    aircraft: aircraftMode.value,
    info: airportTab.value,
    weather: weatherTab.value,
    mode: mapMode.value,
    tracks: Number(arrivalTracks.value).toString(),
}) satisfies Record<string, string | null | undefined>);

onMounted(() => {
    // if (typeof route.query.center === 'string') savedLocation.value = route.query.center;
    if (typeof route.query.zoom === 'string') savedZoom.value = route.query.zoom;

    for (const setting in settings.value) {
        const query = route.query[setting];
        if (typeof query !== 'string' || !query.trim()) continue;

        switch (setting) {
            case 'aircraft':
                if (dashboardAircraftModes.some(x => x.value === query)) aircraftMode.value = query as any;
                break;
            case 'info':
                if (query === 'info' || query === 'proc') airportTab.value = query as any;
                break;
            case 'weather':
                if (query === 'metar' || query === 'taf') weatherTab.value = query as any;
                break;
            case 'tracks':
                arrivalTracks.value = query === '1';
                break;
        }
    }

    mounted.value = true;

    watch(settings, () => {
        router.replace({
            query: settings.value,
        });
    }, {
        deep: true,
    });
});

airportData.value = (await useAsyncData(async () => {
    try {
        const data = $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ icao.value }`);

        return {
            airport: await data,
            notams: [],
            showTracks: false,
            icao: icao.value,
        };
    }
    catch (e) {
        useRadarError(e);
        showError({
            statusCode: 404,
        });
    }
})).data.value!;

useLazyAsyncData(async () => {
    airportData.value!.notams = (await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ icao.value }/notams`).catch(console.error)) ?? [];
    triggerRef(airportData);
}, {
    server: false,
});

const loadingData = ref(false);

async function refreshData() {
    loadingData.value = true;
    try {
        airportData.value!.airport = Object.assign(
            airportData.value!.airport!,
            await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ icao.value }?requestDataType=1`),
        );
        airportData.value!.notams = (await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ icao.value }/notams`).catch(console.error)) ?? airportData.value!.notams;
        triggerRef(airportData);
    }
    catch (e) {
        useRadarError(e);
    }
    finally {
        loadingData.value = false;
    }
}

let interval: NodeJS.Timeout | undefined;

onMounted(() => {
    interval = setInterval(refreshData, 1000 * 60 * 5);
});

onBeforeUnmount(() => clearInterval(interval));

await setupDataFetch({
    async onSuccessCallback() {
        if (!airport.value) {
            showError({
                statusCode: 404,
            });
            return;
        }

        await updateCachedProcedures();
        ready.value = true;
    },
});
</script>

<style scoped lang="scss">
.airport {
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    gap: 16px;

    margin: 16px;

    :deep(.aircraft_nav) {
        top: 30px !important;
    }

    :deep(.popup-block), :deep(.aircraft_list), :deep(.atc-popup_list) {
        overflow: unset !important;
        max-height: unset !important;
        padding: 0 !important;
        background: transparent !important;
    }

    :deep(.atc-popup-container) {
        width: 100% !important;
        max-width: 100% !important;
    }

    &_header {
        position: relative;

        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;

        &--hidden {
            display: none;
        }

        &_section {
            position: relative;

            @include pc {
                &:not(:last-child) {
                    padding-right: 16px;

                    &::after {
                        content: '';

                        position: absolute;
                        top: calc(50% - 12px);
                        left: 100%;

                        width: 1px;
                        height: 24px;

                        background: varToRgba('lightGray500', 0.2);
                    }
                }
            }
        }

        &__title {
            display: flex;
            gap: 8px;
            align-items: center;


            font-size: 16px;
            line-height: 100%;
            text-transform: uppercase;

            &_name {
                font-weight: 600;
                color: $blue500
            }

            &_refresh {
                flex-grow: 1;
            }
        }
    }

    &_sections {
        overflow: auto;
        display: flex;
        gap: 16px;
        height: var(--dashboard-height);

        @include mobile {
            flex-direction: column;
            height: auto;
        }
    }

    &_column {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        gap: 16px;

        width: 0;

        @include mobile {
            width: 100%;
        }

        @include pc {
            &--aircraft:not(:nth-child(2), :only-child) {
                flex-grow: 2;
                max-width: max(20%, 280px);
            }
        }

        &_data {
            scrollbar-gutter: stable;

            overflow: auto;

            padding: 16px;
            border: 1px solid $strokeDefault;
            border-radius: 8px;

            background: $black;

            &:not(:only-child) {
                height: calc(var(--dashboard-height) / 2 - 8px);
            }

            &:only-child {
                flex: 1 0 auto;
                max-height: var(--dashboard-height);
            }

            :deep(.aircraft_nav_item:not(.aircraft_nav_item--active)) {
                background: $darkGray600 !important;
            }
        }

        &__title {
            position: sticky;
            z-index: 3;
            top: -16px;

            display: flex;
            align-items: center;
            justify-content: space-between;

            width: calc(100% + 16px);
            margin-top: -8px;
            margin-bottom: 16px;
            margin-left: -16px;
            padding: 4px 0 4px 16px;


            font-size: 17px;
            font-weight: 700;
            color: $lightGray500;

            background: $black;

            :deep(.tabs_list) {
                height: auto;
            }

            :deep(.tabs_tab) {
                padding-top: 0;
            }
        }
    }

    &_map {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        height: var(--map-height);

        iframe {
            all: unset;
            overflow: hidden;
            width: 100%;
            border-radius: 8px;
        }

        &_pilot {
            position: absolute;
            right: 0;

            overflow: auto;

            width: 25%;
            min-width: 25%;

            &--appear {
                &-enter-active,
                &-leave-active {
                    transition: 0.3s;
                }

                &-enter-from,
                &-leave-to {
                    width: 0;
                    min-width:0;
                }
            }

            &--popup {
                position: relative;
                width: 700px;
                max-width: 100%;
            }
        }
    }
}
</style>
