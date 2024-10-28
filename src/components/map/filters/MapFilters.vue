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
                        <common-block-title>
                            Carto Settings
                        </common-block-title>

                        <common-toggle
                            :disabled="!radarIsCarto"
                            :model-value="store.localSettings.filters?.layers?.layerLabels ?? true"
                            @update:modelValue="setUserLocalSettings({ filters: { layers: { layerLabels: $event } } })"
                        >
                            Show labels
                        </common-toggle>
                        <br>
                        <common-toggle
                            :disabled="!radarIsCarto"
                            :model-value="store.localSettings.filters?.layers?.layerVector ?? false"
                            @update:modelValue="setUserLocalSettings({ filters: { layers: { layerVector: $event } } })"
                        >
                            Vector mode
                            <template #description>
                                Better looking, less traffic, worse performance
                            </template>
                        </common-toggle>

                        <br>
                        <common-block-title>
                            Layers
                        </common-block-title>

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
                            :model-value="store.localSettings.filters?.layers?.layer ?? 'carto'"
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
                        :model-value="selectedFilter === 'filters'"
                        @update:modelValue="!$event ? selectedFilter = null : undefined"
                    >
                        <template #title>
                            Filters & Traffic
                        </template>

                        <common-toggle
                            :model-value="!!store.localSettings.traffic?.disableFastUpdate"
                            @update:modelValue="setUserLocalSettings({ traffic: { disableFastUpdate: $event } })"
                        >
                            Disable fast update
                            <template #description>
                                Sets update to once per 15 seconds. Expected delay from 15 to 45 seconds, but it will consume much less traffic
                            </template>
                        </common-toggle>
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
                        width="450px"
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
                                            @input="importPreset"
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
import type { UserMapSettings } from '~/utils/backend/map-settings';
import { MAX_MAP_PRESETS } from '~/utils/shared';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';

const store = useStore();

const isOpened = computed(() => store.localSettings.filters?.opened !== false);
const selectedFilter = ref<string | null>(null);

const selectFilter = (filter: string) => {
    selectedFilter.value = selectedFilter.value === filter ? null : filter;
};

const filtersImport = useTemplateRef('filtersImport');

const importedPreset = shallowRef<UserMapSettings | false | null>(null);
const importedPresetName = ref('');

const mapLayers: RadioItemGroup<MapLayoutLayerExternalOptions>[] = [
    {
        value: 'carto',
        text: 'CartoDB',
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

const radarIsCarto = computed(() => !mapLayers.some(x => x.value === store.localSettings.filters?.layers?.layer) ||
    store.localSettings.filters?.layers?.layer?.startsWith('carto') ||
    (store.localSettings.filters?.layers?.layer === 'OSM' && store.theme !== 'light'));

const changeLayer = (layer: MapLayoutLayer) => {
    setUserLocalSettings({ filters: { layers: { layer } } });
};

const importPreset = async () => {
    const file = filtersImport.value?.files?.[0];
    if (!file) return;

    try {
        await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.addEventListener('load', async () => {
                const result = JSON.parse(reader.result as string);

                try {
                    const validation = await $fetch<{ status: 'ok' }>('/api/user/settings/map/validate', {
                        method: 'POST',
                        body: 'id' in result
                            ? result
                            : {
                                json: result,
                            },
                    });

                    if (validation.status === 'ok') {
                        if ('id' in result) {
                            importedPresetName.value = result.name;
                            importedPreset.value = result.json;
                        }
                        else {
                            importedPresetName.value = '';
                            importedPreset.value = result;
                        }
                    }

                    resolve();
                }
                catch (e) {
                    reject(e);
                }
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
    z-index: 6;
    top: 16px;
    left: 16px;

    &__warning {
        padding: 10px;

        font-size: 11px;
        color: $lightgray150;

        background: $darkgray850;
        border-radius: 8px;
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

        font-family: $openSansFont;
        font-size: 14px;
        font-weight: 600;
        color: $lightgray150Orig;
        text-align: center;
        text-decoration: none;

        background: #48484a;
        border-radius: 4px;

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
