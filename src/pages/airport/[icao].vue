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
                        in-dashboard
                        :simple-mode="column.key"
                    />
                </div>
            </div>
        </div>
        <div
            :key="store.theme"
            class="airport_map"
        >
            <iframe :src="`/?preset=dashboard&airport=${ icao }&airportMode=${ aircraftMode ?? 'all' }`"/>
        </div>
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

const route = useRoute();
const store = useStore();
const dataStore = useDataStore();
const ready = ref(false);

const icao = computed(() => (route.params.icao as string)?.toUpperCase());
const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === icao.value));
const airportData = shallowRef<StoreOverlayAirport['data'] | null>(null);
const atc = getATCForAirport(airportData as Ref<StoreOverlayAirport['data']>);
const aircraft = getAircraftForAirport(airportData as Ref<StoreOverlayAirport['data']>);

provideAirport(airportData as Ref<StoreOverlayAirport['data']>);

useHead({
    title: icao,
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

const displayedColumns = ref<MapAircraftKeys[]>([]);
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

const mapLayouts: Record<MapMode, { dash: string; map: string }> = {
    default: {
        dash: `calc(60dvh - (32px + 56px) - 40px - 16px)`,
        map: 'calc(40dvh - 16px)',
    },
    dashBigMapBig: {
        dash: '80dvh',
        map: '80dvh',
    },
    dashSmallMapBig: {
        dash: '30dvh',
        map: '70dvh',
    },
    dashBigMapSmall: {
        dash: '70dvh',
        map: '30dvh',
    },
    dashOnly: {
        dash: '90dvh',
        map: '0',
    },
    mapOnly: {
        dash: '0',
        map: '90dvh',
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
                darkColor = true;
                break;
            case 'groundDep':
                color = radarColors.success500;
                break;
            case 'departures':
                color = radarColors.warning300;
                darkColor = true;
                break;
            case 'arrivals':
                color = radarColors.warning700;
                darkColor = true;
                break;
            case 'groundArr':
                color = radarColors.error500;
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

let showPilotStats = useCookie<boolean>('show-pilot-stats', {
    sameSite: 'strict',
    secure: true,
    default: () => false,
});

watch(controllerMode, () => {
    // Otherwise not updated for some reason
    showPilotStats = useCookie<boolean>('show-pilot-stats', {
        sameSite: 'strict',
        secure: true,
    });
});

airportData.value = (await useAsyncData(async () => {
    try {
        const data = $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ icao.value }`);
        const notams = $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ icao.value }/notams`).catch(console.error);

        return {
            airport: await data,
            notams: await notams ?? [],
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

    &_header {
        display: flex;
        align-items: center;

        &_section {
            position: relative;

            &:not(:last-child) {
                margin-right: 16px;
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

            :deep(.info-block) {
                background: $darkgray875 !important;
            }

            :deep(.title_text_content), :deep(.aircraft_list__filter){
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
                color: $darkgray800;
            }
        }
    }

    &_map {
        overflow: hidden;
        height: var(--map-height);
        border-radius: 8px;

        iframe {
            all: unset;
            width: 100%;
            height: 100%;
        }
    }
}
</style>
