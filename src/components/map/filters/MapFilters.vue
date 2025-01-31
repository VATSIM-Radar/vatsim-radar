<template>
    <div
        class="filters"
        :class="{ 'filters--collapsed': !isOpened }"
    >
        <common-button
            class="filters_toggle"
            @click="setUserLocalSettings({ filters: { opened: !isOpened } })"
        >
            <template #icon>
                <filter-icon/>
            </template>
        </common-button>

        <transition name="filters_sections--appear">
            <div
                v-if="isOpened"
                class="filters_sections"
                :class="{ 'filters_sections--has-pilot': store.user && dataStore.vatsim.data.keyedPilots.value?.[+store.user.cid] }"
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
                        :model-value="selectedFilter === 'map'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Map layer
                        </template>

                        <template v-if="radarIsDefault">
                            <common-block-title>
                                Settings
                            </common-block-title>

                            <common-toggle
                                :disabled="!radarIsDefault"
                                :model-value="store.localSettings.filters?.layers?.layerLabels ?? true"
                                @update:modelValue="setUserLocalSettings({ filters: { layers: { layerLabels: $event } } })"
                            >
                                Show labels
                            </common-toggle>
                            <!--
                            <template v-if="!store.localSettings.filters?.layers?.layer || store.localSettings.filters?.layers?.layer?.startsWith('protoData')">
                                <common-toggle
                                    v-if="!store.localSettings.filters?.layers?.layer || store.localSettings.filters?.layers?.layer?.startsWith('protoData')"
                                    :disabled="store.getCurrentTheme === 'default'"
                                    :model-value="store.localSettings.filters?.layers?.layer === 'protoDataGray'"
                                    @update:modelValue="setUserLocalSettings({ filters: { layers: { layer: !$event ? 'protoData' : 'protoDataGray' } } })"
                                >
                                    Grayscale

                                    <template
                                        v-if="store.getCurrentTheme === 'default'"
                                        #description
                                    >
                                        Light theme only
                                    </template>
                                </common-toggle>
                            </template>
-->

                            <br>
                        </template>

                        <common-block-title>
                            Layers
                        </common-block-title>

                        <common-notification
                            cookie-name="layers-tutorial"
                            type="info"
                        >
                            Light and Detailed have worse performance than other layers
                        </common-notification>
                        <br>

                        <map-filter-transparency
                            v-if="store.localSettings.filters?.layers?.layer === 'OSM'"
                            setting="osm"
                        />
                        <map-filter-transparency
                            v-else-if="store.localSettings.filters?.layers?.layer === 'Satellite'"
                            setting="satellite"
                        />
                        <common-radio-group
                            :items="mapLayers"
                            :model-value="store.localSettings.filters?.layers?.layer ?? 'protoData'"
                            @update:modelValue="changeLayer($event as MapLayoutLayer)"
                        />
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
                            Weather on map
                        </template>
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
                    </common-control-block>
                </div>
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'filters' }"
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
                    v-if="store.user && dataStore.vatsim.data.keyedPilots.value?.[+store.user.cid]"
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
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import type {
    MapLayoutLayer,
    MapLayoutLayerExternalOptions,
    MapWeatherLayer,
} from '~/types/map';
import MapFilterTransparency from '~/components/map/filters/MapFilterTransparency.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import MapSettings from '~/components/map/filters/settings/MapSettings.vue';
import type { IUserMapSettings, UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { isProductionMode, MAX_FILTERS, MAX_MAP_PRESETS } from '~/utils/shared';
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
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();

const isOpened = computed(() => store.localSettings.filters?.opened !== false);
const selectedFilter = ref<string | null>(null);

const selectFilter = (filter: string) => {
    selectedFilter.value = selectedFilter.value === filter ? null : filter;
};

const filtersImportMode = ref(null as null | 'settings' | 'filters');
const filtersImport = useTemplateRef('filtersImport');

const importedPreset = shallowRef<UserMapSettings | false | null>(null);
const importedPresetName = ref('');
const isMobile = useIsMobile();

let mapLayers: RadioItemGroup<MapLayoutLayerExternalOptions>[] = [
    {
        value: 'protoData',
        text: 'Light',
    },
    {
        value: 'protoGeneral',
        text: 'Detailed',
    },
    {
        value: 'basic',
        text: 'Basic',
    },
    {
        value: 'Satellite',
    },
    {
        value: 'OSM',
        hint: 'Will only show for light theme',
        hintLocation: 'left',
    },
];

if (isProductionMode()) mapLayers = mapLayers.filter(x => x.value !== 'Satellite');

const radarIsDefault = computed(() => !mapLayers.some(x => x.value === store.localSettings.filters?.layers?.layer) ||
    store.localSettings.filters?.layers?.layer?.startsWith('proto') ||
    (store.localSettings.filters?.layers?.layer === 'OSM' && store.theme !== 'light'));

const changeLayer = (layer: MapLayoutLayer) => {
    setUserLocalSettings({ filters: { layers: { layer } } });
};

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
    return mapStore.overlays.find(x => x.type === 'pilot' && x.key === store.user?.cid) as StoreOverlayPilot | undefined;
});

const handleUserTrack = () => {
    const overlay = myOverlay.value;
    if (!overlay) mapStore.addPilotOverlay(store.user!.cid, true);
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
        console.error(e);
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
        text: 'Precipitation',
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
    z-index: 8;
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

            &--location {
                margin-top: 8px;

                svg {
                    transform-origin: center;
                    transition: 0.3s;
                }
            }

            &--tracked svg {
                transform: rotate(-45deg) translate(-2px, 2px);
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
