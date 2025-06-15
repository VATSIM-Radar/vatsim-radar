<template>
    <div
        class="filters"
        :class="{ 'filters--collapsed': !isOpened }"
    >
        <div class="filters_top">
            <common-button
                class="filters_toggle"
                @click="setUserLocalSettings({ filters: { opened: !isOpened } })"
            >
                <template #icon>
                    <filter-icon/>
                </template>
            </common-button>
            <div class="filters_sections"/>
        </div>

        <transition name="filters_sections--appear">
            <div
                v-if="isOpened"
                class="filters_sections"
                :class="{ 'filters_sections--has-pilot': store.user && !!ownFlight }"
            >
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'map' }"
                    @click="selectFilter('map')"
                >
                    <common-button :type="selectedFilter === 'map' ? 'primary' : 'secondary'">
                        <template #icon>
                            <map-icon/>
                        </template>
                    </common-button>
                    <common-control-block
                        center-by="start"
                        class="filters_sections_section_content"
                        location="right"
                        max-height="57vh"
                        :model-value="selectedFilter === 'map'"
                        :width="isMobile ? 'calc(100dvw - 100px)' : '450px'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Map layers
                        </template>

                        <map-filters-layers/>
                    </common-control-block>
                </div>
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'weather' }"
                    @click="selectFilter('weather')"
                >
                    <common-button :type="selectedFilter === 'weather' ? 'primary' : 'secondary'">
                        <template #icon>
                            <ground-icon/>
                        </template>
                    </common-button>
                    <common-control-block
                        center-by="start"
                        class="filters_sections_section_content"
                        location="right"
                        :model-value="selectedFilter === 'weather'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Weather
                        </template>
                        <div class="__info-sections">
                            <common-button
                                size="S"
                                @click="store.metarRequest = true"
                            >
                                Weather Request
                            </common-button>
                            <common-block-title remove-margin>
                                Weather on map
                            </common-block-title>
                            <a
                                class="filters__open-weather"
                                href="https://openweathermap.org/"
                                target="_blank"
                            >
                                <div class="filters__open-weather_text">
                                    Data provided by
                                </div>
                                <img
                                    alt="OpenWeather"
                                    class="filters__open-weather_image"
                                    src="@/assets/images/openweather.png"
                                >
                            </a>
                            <map-filter-transparency :setting="store.theme === 'light' ? 'weatherLight' : 'weatherDark'"/>
                            <common-radio-group
                                :items="weatherLayers"
                                :model-value="store.localSettings.filters?.layers?.weather2 || 'false'"
                                @update:modelValue="setUserLocalSettings({ filters: { layers: { weather2: $event as MapWeatherLayer } } })"
                            />
                        </div>
                    </common-control-block>
                </div>
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'filters', 'filters_sections_section--active': hasActivePilotFilter() }"
                    @click="selectFilter('filters')"
                >
                    <common-button :type="selectedFilter === 'filters' ? 'primary' : 'secondary'">
                        <template #icon>
                            <filters-icon/>
                        </template>
                    </common-button>
                    <common-control-block
                        center-by="start"
                        class="filters_sections_section_content"
                        location="right"
                        max-height="55vh"
                        min-height="400px"
                        :model-value="selectedFilter === 'filters'"
                        :width="isMobile ? 'calc(100dvw - 100px)' : '450px'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Filters, Traffic, Bookmarks
                        </template>

                        <template
                            v-if="store.filterPresets.length < MAX_FILTERS"
                            #closeActions
                        >
                            <common-tooltip
                                location="left"
                                open-method="mouseOver"
                                width="110px"
                            >
                                <template #activator>
                                    <div class="filters__import">
                                        <import-icon
                                            width="18"
                                            @click="filtersImport?.click()"
                                        />
                                        <input
                                            v-show="false"
                                            ref="filtersImport"
                                            accept="application/json"
                                            type="file"
                                            @input="[filtersImportMode = 'filters', importPreset()]"
                                        >
                                    </div>
                                </template>

                                Import Filter
                            </common-tooltip>
                        </template>

                        <map-filters-traffic/>
                    </common-control-block>
                </div>
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'settings' }"
                    @click="selectFilter('settings')"
                >
                    <common-button :type="selectedFilter === 'settings' ? 'primary' : 'secondary'">
                        <template #icon>
                            <layers-icon/>
                        </template>
                    </common-button>
                    <common-control-block
                        center-by="start"
                        class="filters_sections_section_content"
                        location="right"
                        max-height="55vh"
                        min-height="400px"
                        :model-value="selectedFilter === 'settings'"
                        :width="isMobile ? 'calc(100dvw - 100px)' : '450px'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Map Settings
                        </template>

                        <template
                            v-if="store.mapPresets.length < MAX_MAP_PRESETS"
                            #closeActions
                        >
                            <common-tooltip
                                location="left"
                                open-method="mouseOver"
                                width="110px"
                            >
                                <template #activator>
                                    <div class="filters__import">
                                        <import-icon
                                            width="18"
                                            @click="filtersImport?.click()"
                                        />
                                        <input
                                            v-show="false"
                                            ref="filtersImport"
                                            accept="application/json"
                                            type="file"
                                            @input="[filtersImportMode = 'settings', importPreset()]"
                                        >
                                    </div>
                                </template>

                                Import Preset
                            </common-tooltip>
                        </template>

                        <map-settings
                            v-model:imported-preset="importedPreset"
                            v-model:imported-preset-name="importedPresetName"
                        />
                    </common-control-block>
                </div>
                <div
                    v-if="isDebug && isPC"
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'debug' }"
                    @click="selectFilter('debug')"
                >
                    <common-button :type="selectedFilter === 'debug' ? 'primary' : 'secondary'">
                        <template #icon>
                            <debug-icon/>
                        </template>
                    </common-button>
                    <common-control-block
                        center-by="start"
                        class="filters_sections_section_content"
                        location="right"
                        max-height="450px"
                        :model-value="selectedFilter === 'debug'"
                        width="500px"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Debug
                        </template>
                        <map-filters-debug/>
                    </common-control-block>
                </div>
                <div
                    v-if="store.user && (ownFlight || observerFlight)"
                    class="filters_sections_section filters_sections_section--location"
                    :class="{ 'filters_sections_section--tracked': myOverlay?.data.tracked }"
                    @click="handleUserTrack"
                >
                    <common-button :type="myOverlay?.data.tracked ? 'primary' : 'secondary'">
                        <template #icon>
                            <location-icon/>
                        </template>
                    </common-button>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import FiltersIcon from '@/assets/icons/kit/filters.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import ImportIcon from '@/assets/icons/kit/import.svg?component';
import GroundIcon from '@/assets/icons/kit/mountains.svg?component';
import LayersIcon from '@/assets/icons/kit/layers.svg?component';
import DebugIcon from '@/assets/icons/kit/debug.svg?component';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import type {
    MapWeatherLayer,
} from '~/types/map';
import MapFilterTransparency from '~/components/map/filters/MapFilterTransparency.vue';
import MapSettings from '~/components/map/filters/settings/MapSettings.vue';
import type { IUserMapSettings, UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { MAX_FILTERS, MAX_MAP_PRESETS } from '~/utils/shared';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';
import MapFiltersTraffic from '~/components/map/filters/MapFiltersTraffic.vue';
import { saveMapSettings } from '~/composables/settings';
import { sendUserPreset } from '~/composables/fetchers';
import { setUserFilter } from '~/composables/fetchers/filters';
import type { IUserFilter } from '~/utils/backend/handlers/filters';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import { klona } from 'klona/json';
import { useMapStore } from '~/store/map';
import type { StoreOverlayPilot } from '~/store/map';
import { useRadarError } from '~/composables/errors';
import MapFiltersLayers from '~/components/map/filters/MapFiltersLayers.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { observerFlight, ownFlight, skipObserver } from '~/composables/pilots';

const store = useStore();
const mapStore = useMapStore();

const isOpened = computed(() => store.localSettings.filters?.opened !== false);
const selectedFilter = ref<string | null>(null);

const selectFilter = (filter: string) => {
    selectedFilter.value = selectedFilter.value === filter ? null : filter;
};

const filtersImportMode = ref(null as null | 'settings' | 'filters');
const filtersImport = useTemplateRef('filtersImport');

const MapFiltersDebug = defineAsyncComponent(() => import('./debug/MapFiltersDebug.vue'));

const importedPreset = shallowRef<UserMapSettings | false | null>(null);
const importedPresetName = ref('');
const isMobile = useIsMobile();
const isPC = useIsPC();

const isDebug = useIsDebug();

const createPreset = async () => {
    if (filtersImportMode.value === 'settings') {
        await saveMapSettings(await sendUserPreset(store.presetImport.name!, store.presetImport.preset as IUserMapSettings, 'settings/map', createPreset));
    }
    else {
        setUserFilter(await sendUserPreset(store.presetImport.name!, store.presetImport.preset as IUserFilter, 'filters', createPreset));
        setUserActiveFilter(klona(store.filter));
    }
    store.presetImport.preset = null;

    if (filtersImportMode.value === 'settings') {
        store.fetchMapPresets();
    }
    else {
        store.fetchFiltersPresets();
        store.getVATSIMData(true);
    }
};

const myOverlay = computed(() => {
    return mapStore.overlays.find(x => x.type === 'pilot' && x.key === ownFlight.value?.cid.toString()) as StoreOverlayPilot | undefined;
});

const handleUserTrack = () => {
    if (observerFlight.value && !ownFlight.value) {
        mapStore.selectedCid = null;
        skipObserver.value.value = false;
        return;
    }

    const overlay = myOverlay.value;
    if (!overlay) mapStore.addPilotOverlay(ownFlight.value!.cid, true);
    else overlay.data.tracked = !overlay.data.tracked;
};

const importPreset = async () => {
    const file = filtersImport.value?.files?.[0];
    if (!file) return;

    try {
        await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.addEventListener('load', async () => {
                store.initPresetImport({
                    file: reader.result as string,
                    prefix: filtersImportMode.value === 'settings' ? 'settings/map' : 'filters',
                    save: createPreset,
                });
                resolve();
            });

            reader.addEventListener('error', e => {
                reject(e);
            });

            reader.readAsText(file);
        });
    }
    catch (e) {
        useRadarError(e);
        importedPreset.value = false;
    }
};

const weatherLayers: RadioItemGroup<MapWeatherLayer | 'false'>[] = [
    {
        value: 'false',
        text: 'None',
    },
    {
        value: 'CL',
        text: 'Clouds',
    },
    {
        value: 'PR0',
        text: 'Precipitation Radar',
    },
    {
        value: 'PR0C',
        text: 'Precipitation Intensity',
    },
    {
        value: 'rainViewer',
        text: 'Precipitation (RainViewer)',
        hint: 'RainViewer has less coverage, but you can use it if you want!',
        hintLocation: 'right',
    },
    {
        value: 'WND',
        text: 'Wind (w/direction arrows)',
    },
];
</script>

<style scoped lang="scss">
.filters {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 16px;

    &__warning {
        padding: 10px;
        border-radius: 8px;

        font-size: 11px;
        color: $lightgray150;

        background: $darkgray850;
    }

    &_toggle {
        margin-bottom: 16px;
    }

    &--collapsed .filters {
        &_toggle {
            opacity: 0.7;

            @include hover {
                &:hover {
                    opacity: 1;
                }
            }
        }
    }

    &_sections {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 8px;

        &--appear {
            &-enter-active,
            &-leave-active {
                top: 0;
                overflow: hidden;
                max-height: calc(40px * 4 + 8px * 3);
                transition: 0.5s cubic-bezier(0.52, 0, 0.195, 1.65)
            }

            &-enter-from,
            &-leave-to {
                top: -16px;
                max-height: 0;
                opacity: 0;
            }
        }

        &_section {
            position: relative;
            display: flex;

            @include mobileOnly {
                position: unset;
            }

            &--location {
                margin-top: 8px;

                svg {
                    transform-origin: center;
                    transition: 0.3s;
                }
            }

            &--active {
                &::before {
                    content: '';

                    position: absolute;
                    top: -4px;
                    right: -4px;

                    width: 12px;
                    height: 12px;
                    border: 2px solid $lightgray125;
                    border-radius: 100%;

                    background: $primary500;
                }
            }

            &--tracked svg {
                transform: rotate(-45deg) translate(-2px, 2px);
            }

            &_content {
                @include mobileOnly {
                    top: 0;
                }
            }
        }

        @media(max-height: 630px) {
            flex-direction: row;

            .control-block {
                max-width: calc(100dvw - 200px - 48px) !important;
            }
        }
    }

    .select {
        margin-bottom: 10px;
    }

    &__open-weather {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;

        margin-bottom: 8px;
        padding: 8px 4px;
        border-radius: 4px;

        font-family: $openSansFont;
        font-size: 14px;
        font-weight: 600;
        color: $lightgray150Orig;
        text-align: center;
        text-decoration: none;

        background: #48484a;

        &_image {
            max-width: 40%;
        }
    }

    &__import {
        padding-right: 16px;
        border-right: 1px solid varToRgba('lightgray150', 0.15);

        svg {
            cursor: pointer;
            transition: 0.3s;
        }

        @include hover {
            svg:hover {
                color:$primary500;
            }
        }
    }
}
</style>
