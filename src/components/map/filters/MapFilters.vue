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
                    @click="selectedFilter = 'map'"
                >
                    <common-button type="secondary">
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
                            Radar layers
                        </common-block-title>

                        <div class="__info-sections">
                            <!--
                            <common-toggle
                                v-model="radarIsLabels"
                                :disabled="!radarLayerOption"
                            >
                                Show labels
                            </common-toggle>

                            <common-radio-group
                                :items="[{ value: 'default', text: 'Default' }, { value: 'satellite', text: 'Satellite' }]"
                                :model-value="radarLayerOption"
                                two-cols
                                @update:modelValue="changeLayer($event as MapLayoutLayer | RadarLayerOptions)"
                            />
-->

                            <div class="filters__warning">
                                Radar layers have been disabled due to too much cost :(<br><br>

                                We will try to deal with this next month - when our quota is reset.
                            </div>

                            <common-block-title>
                                External layers
                            </common-block-title>
                        </div>

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
                            :model-value="store.localSettings.filters?.layers?.layer ?? null"
                            @update:modelValue="changeLayer($event as MapLayoutLayer | RadarLayerOptions)"
                        />
                    </common-control-block>
                </div>
                <div
                    class="filters_sections_section"
                    :class="{ 'filters_sections_section--selected': selectedFilter === 'weather' }"
                    @click="selectedFilter = 'weather'"
                >
                    <common-button type="secondary">
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
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import GroundIcon from '@/assets/icons/kit/mountains.svg?component';
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

const store = useStore();

const isOpened = computed(() => !!store.localSettings.filters?.opened);
const selectedFilter = ref<string | null>(null);

const mapLayers: RadioItemGroup<MapLayoutLayerExternalOptions>[] = [
    {
        value: 'CartoDB',
        text: 'CartoDB (Without labels)',
    },
    {
        value: 'CartoDBLabels',
        text: 'CartoDB (With labels)',
    },
    {
        value: 'Satellite',
    },
    {
        value: 'Jawg',
        hint: 'Only available for dark theme',
        hintLocation: 'left',
    },
    {
        value: 'OSM',
        hint: 'Only available for light theme',
        hintLocation: 'left',
    },
    {
        value: 'JawgOrOSM',
        text: 'Jawg/OSM',
        hint: 'Useful if you love to switch between themes and hate Carto',
        hintLocation: 'right',
    },
];

const radarIsLabels = ref(store.localSettings.filters?.layers?.layer === 'RadarLabels' || store.localSettings.filters?.layers?.layer === 'RadarSatelliteLabels');

type RadarLayerOptions = 'default' | 'satellite';

const radarLayerOption = computed<RadarLayerOptions | null>(() => {
    const layer = store.localSettings.filters?.layers?.layer;
    if (!layer) return 'default';
    return (layer === 'RadarSatelliteLabels' || layer === 'RadarSatelliteNoLabels') ? 'satellite' : (layer === 'RadarLabels' || layer === 'RadarNoLabels') ? 'default' : null;
});

const changeLayer = (layer: MapLayoutLayer | RadarLayerOptions) => {
    if (layer === 'default' || layer === 'satellite') {
        if (layer === 'default') setUserLocalSettings({ filters: { layers: { layer: radarIsLabels.value ? 'RadarLabels' : 'RadarNoLabels' } } });
        else setUserLocalSettings({ filters: { layers: { layer: radarIsLabels.value ? 'RadarSatelliteLabels' : 'RadarSatelliteNoLabels' } } });

        return;
    }

    setUserLocalSettings({ filters: { layers: { layer } } });
};

watch(radarIsLabels, () => {
    if (radarLayerOption.value) {
        changeLayer(radarLayerOption.value);
    }
});

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
    z-index: 5;
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
            opacity: 0.5;

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
                max-height: calc(40px * 3 + (8px * 3) / 2);
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
}
</style>
