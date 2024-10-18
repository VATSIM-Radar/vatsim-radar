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
                </div>
            </div>
            <div class="airport_header_section">
                <common-select
                    v-model="aircraftMode"
                    :items="aircraftModes"
                    placeholder="Filter Map Aircraft"
                    width="200px"
                />
            </div>
            <div class="airport_header_section">
                <common-select
                    v-model="mapMode"
                    :items="mapModes"
                    placeholder="Page Layout"
                    width="200px"
                />
            </div>
            <div class="airport_header_section">
                <common-toggle v-model="controllerMode">
                    Controller Mode
                </common-toggle>
            </div>
            <div
                v-if="controllerMode"
                class="airport_header_section"
            >
                <common-select
                    v-model="displayedColumns"
                    :items="displayableColumns"
                    multiple
                    placeholder="Displayed columns"
                    show-placeholder
                    width="200px"
                />
            </div>
            <div
                v-if="controllerMode"
                class="airport_header_section"
            >
                <common-toggle
                    v-model="showPilotStats"
                >
                    Show pilot stats
                </common-toggle>
            </div>
            <client-only
                v-if="controllerMode"
                class="airport_header_section"
            >
                <div class="airport_header__title">
                    <div class="airport_header__title_label">
                        Time
                    </div>
                    <div class="airport_header__title_name">
                        {{ formatDateDime.format(dataStore.time.value) }}z
                    </div>
                </div>
            </client-only>
        </div>
        <div
            v-if="!controllerMode"
            class="airport_sections"
        >
            <div
                v-if="airportData?.airport?.vatInfo || airportData?.airport?.metar"
                class="airport_column"
            >
                <div
                    v-if="airportData?.airport?.vatInfo"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        VATSIM Airport Info
                    </div>
                    <airport-info/>
                </div>
                <div
                    v-if="airportData?.airport?.metar"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        METAR
                    </div>
                    <airport-metar/>
                </div>
            </div>
            <div
                v-if="airportData?.airport?.taf || airportData.notams?.length"
                class="airport_column"
            >
                <div
                    v-if="airportData?.airport?.taf"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        TAF
                    </div>
                    <airport-taf/>
                </div>
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
                        <common-bubble class="airport_column__title_aside">
                            {{ atc.length }}
                        </common-bubble>
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
            v-else
            class="airport_sections"
            :class="[`airport_sections--aircraft-cols-${ controllerColumns.length }`]"
        >
            <div
                v-for="column in controllerColumns"
                :key="column.key"
                class="airport_column"
                :style="{ '--color': column.color }"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        <div class="airport__aircraft-title">
                            <div class="airport__aircraft-title_text">
                                {{ column.title }}
                            </div>
                            <div
                                v-if="column.key === 'arrivals'"
                                class="airport__aircraft-title_interval"
                            >
                                <map-popup-rate
                                    :aircraft="aircraft"
                                    :icon-color="radarColors.warning500"
                                    :text-color="radarColors.warning500"
                                    :use-opacity="store.theme === 'default'"
                                />
                            </div>
                            <common-bubble
                                class="airport__aircraft-title_bubble"
                                :class="{ 'airport__aircraft-title_bubble--dark': column.darkColor }"
                            >
                                {{ aircraft?.[column.key]?.length ?? 0 }}
                            </common-bubble>
                        </div>
                    </div>
                    <airport-aircraft
                        v-if="ready"
                        v-model:selected="selectedPilot"
                        in-dashboard
                        :simple-mode="column.key"
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
                ref="airportMapFrame"
                class="airport_map_iframe"
                :src="`/?preset=dashboard&airport=${ icao }&airportMode=${ aircraftMode ?? 'all' }`"
            />
            <transition name="airport_map_pilot--appear">
                <airport-pilot
                    v-if="selectedPilot"
                    :key="selectedPilot"
                    :cid="selectedPilot"
                    class="airport_map_pilot"
                    @update:modelValue="selectedPilot = null"
                />
            </transition>
        </div>
        <common-popup
            v-else-if="selectedPilot"
            disabled
            :model-value="!!selectedPilot"
            @update:modelValue="!$event && (selectedPilot = null)"
        >
            <airport-pilot
                :cid="selectedPilot"
                class="airport_map_pilot airport_map_pilot--popup"
                @update:modelValue="selectedPilot = null"
            />
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import AirportInfo from '~/components/views/airport/AirportInfo.vue';
import { getAircraftForAirport, getATCForAirport, provideAirport } from '~/composables/airport';
import type { StoreOverlayAirport } from '~/store/map';
import AirportMetar from '~/components/views/airport/AirportMetar.vue';
import AirportTaf from '~/components/views/airport/AirportTaf.vue';
import AirportNotams from '~/components/views/airport/AirportNotams.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import type { Ref } from 'vue';
import AirportAircraft from '~/components/views/airport/AirportAircraft.vue';
import AirportControllers from '~/components/views/airport/AirportControllers.vue';
import { useStore } from '~/store';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import type { SelectItem } from '~/types/components/select';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import type { MapAircraftKeys, MapAircraftMode } from '~/types/map';
import { useShowPilotStats } from '~/composables/pilots';
import AirportPilot from '~/components/views/airport/AirportPilot.vue';
import MapPopupRate from '~/components/map/popups/MapPopupRate.vue';

const route = useRoute();
const store = useStore();
const dataStore = useDataStore();
const ready = ref(false);
const config = useRuntimeConfig();

const icao = computed(() => (route.params.icao as string)?.toUpperCase());
const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === icao.value));
const airportData = shallowRef<StoreOverlayAirport['data'] | null>(null);
const atc = getATCForAirport(airportData as Ref<StoreOverlayAirport['data']>);
const aircraft = getAircraftForAirport(airportData as Ref<StoreOverlayAirport['data']>);

provideAirport(airportData as Ref<StoreOverlayAirport['data']>);

useHead({
    title: icao,
});

const selectedPilot = ref<number | null>(null);


const airportMapFrame = ref<HTMLIFrameElement | null>(null);
let skipSelectedPilotWatch = false;
function receiveMessage(event: MessageEvent) {
    if (event.origin !== config.public.DOMAIN) {
        return;
    }
    if (event.data && 'selectedPilot' in event.data) {
        if (selectedPilot.value !== event.data.selectedPilot) {
            selectedPilot.value = event.data.selectedPilot;
            skipSelectedPilotWatch = true; // the change in the line above will trigger the watch of selectedPilot. But here in this function we have received the change from the iframe, so we need to skip the watch, because we don't need to send a message back to the iframe
        }
    }
}

onMounted(() => {
    window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
    window.removeEventListener('message', receiveMessage);
});

watch(selectedPilot, () => {
    if (skipSelectedPilotWatch) {
        skipSelectedPilotWatch = false;
        return;
    }
    if (aircraft.value?.prefiles.find(x => x.cid === selectedPilot.value)) return; // we can not show prefiles on the map, because they are not connected

    if (airportMapFrame.value && selectedPilot.value) {
        const iframeWindow = airportMapFrame.value.contentWindow;
        const message = { selectedPilot: selectedPilot.value };
        const targetOrigin = config.public.DOMAIN;
        iframeWindow?.postMessage(message, targetOrigin);
    }
});


const formatDateDime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const aircraftMode = ref<MapAircraftMode | null>(null);
const aircraftModes: SelectItem<MapAircraftMode>[] = [
    {
        value: 'all',
        text: 'All',
    },
    {
        value: 'ground',
        text: 'On Ground',
    },
    {
        value: 'groundDep',
        text: 'Departing',
    },
    {
        value: 'departures',
        text: 'Departed',
    },
    {
        value: 'arrivals',
        text: 'Arriving',
    },
    {
        value: 'groundArr',
        text: 'Landed',
    },
];

const displayedColumns = ref<MapAircraftKeys[]>(['prefiles', 'groundDep', 'departures', 'arrivals', 'groundArr']);
// const displayedColumns = useCookie<MapAircraftKeys[]>('dashboard-displayed-columns', {
//     sameSite: 'strict',
//     secure: true,
//     default: () => ['prefiles', 'groundDep', 'departures', 'arrivals', 'groundArr'],
// });

const displayableColumns: SelectItem<MapAircraftKeys>[] = [
    {
        value: 'prefiles',
        text: 'Prefiles',
    },
    {
        value: 'groundDep',
        text: 'Departing',
    },
    {
        value: 'departures',
        text: 'Departed',
    },
    {
        value: 'arrivals',
        text: 'Arriving',
    },
    {
        value: 'groundArr',
        text: 'Landed',
    },
];

type MapMode = 'default' | 'dashBigMapBig' | 'dashSmallMapBig' | 'dashBigMapSmall' | 'dashOnly' | 'mapOnly';
const mapMode = useCookie<MapMode | null>('dashboard-map-mode', {
    sameSite: 'strict',
    secure: true,
    default: () => null,
});

function calculateMapLayout(height: number, type: 'dash' | 'map' | 'default' | 'alone') {
    if (height === 0) return '0';
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
        text: 'Large dashboard',
    },
    {
        value: 'dashOnly',
        text: 'Dashboard only',
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

const controllerColumns = computed(() => {
    return displayableColumns.filter(x => !displayedColumns.value.length || displayedColumns.value.includes(x.value)).map(x => {
        // getPilotStatus

        let color: string;
        let darkColor = false;

        switch (x.value) {
            case 'prefiles':
                color = radarColors.lightgray200;
                darkColor = store.theme === 'default';
                break;
            case 'groundDep':
                color = radarColors.success500;
                break;
            case 'departures':
                color = radarColors.primary700;
                break;
            case 'arrivals':
                color = radarColors.warning500;
                darkColor = true;
                break;
            case 'groundArr':
                color = radarColors.error300;
                break;
        }

        return {
            title: x.text,
            key: x.value,
            color,
            darkColor,
        };
    });
});

const controllerMode = useCookie<boolean>('controller-mode', {
    sameSite: 'strict',
    secure: true,
    default: () => false,
});

const showPilotStats = useShowPilotStats();

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
        console.error(e);
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

await setupDataFetch({
    onSuccessCallback() {
        if (!airport.value) {
            showError({
                statusCode: 404,
            });
            return;
        }

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

    :deep(.info-block) {
        background: $darkgray875 !important;
    }

    :deep(.title_text_content), :deep(.aircraft_list__filter), :deep(.title_collapse), :deep(.pilot) {
        background: $darkgray900 !important;
    }

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
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;

        &_section {
            position: relative;

            &:not(:last-child) {
                padding-right: 16px;

                &::after {
                    content: '';

                    position: absolute;
                    top: calc(50% - 12px);
                    left: 100%;

                    width: 1px;
                    height: 24px;

                    background: varToRgba('lightgray150', 0.2);
                }
            }
        }

        &__title {
            display: flex;
            gap: 8px;
            align-items: center;

            font-family: $openSansFont;
            font-size: 17px;
            line-height: 100%;
            text-transform: uppercase;

            &_name {
                font-weight: 600;
                color: $primary500
            }
        }
    }

    &_sections {
        overflow: auto;
        display: flex;
        gap: 16px;
        height: var(--dashboard-height);

        &--aircraft-cols-4, &--aircraft-cols-5 {
            :deep(.aircraft_list) {
                flex-direction: column;
                flex-wrap: nowrap;
            }
        }
    }

    &_column {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        gap: 16px;

        width: 0;

        &--aircraft {
            flex-grow: 2;
            max-width: max(20%, 280px);
        }

        &_data {
            scrollbar-gutter: stable;

            overflow: auto;

            padding: 16px;

            background: $darkgray900;
            border-radius: 8px;

            &:not(:only-child) {
                height: calc(var(--dashboard-height) / 2 - 8px);
            }

            &:only-child {
                flex: 1 0 auto;
                max-height: var(--dashboard-height);
            }

            :deep(.aircraft_nav_item:not(.aircraft_nav_item--active)) {
                background: $darkgray875 !important;
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
            margin-bottom: 16px;
            margin-left: -16px;
            padding: 4px 0 4px 16px;

            font-family: $openSansFont;
            font-size: 17px;
            font-weight: 700;
            color: $lightgray150;

            background: $darkgray900;
        }
    }

    &__aircraft-title {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        width: 100%;

        color: var(--color);

        & &_bubble {
            background: var(--color);

            &--dark {
                color: $darkgray800Orig;
            }
        }

        &_interval {
            display: flex;
            gap: 12px;

            font-size: 14px;
            font-weight: 700;
            line-height: 100%;
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
