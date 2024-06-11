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
                        <common-radio-group
                            :items="mapLayers"
                            :model-value="store.localSettings.filters?.layers?.layer ?? 'OSM'"
                            @update:modelValue="changeLayer($event)"
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
                        <common-radio-group
                            :items="weatherLayers"
                            :model-value="store.localSettings.filters?.layers?.weather || 'false'"
                            @update:modelValue="setUserLocalSettings({ filters: { layers: { weather: $event } } })"
                        />
                    </common-control-block>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import LayersIcon from '@/assets/icons/kit/layers.svg?component';
import GroundIcon from '@/assets/icons/kit/mountains.svg?component';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import type { MapLayoutLayer, MapLayoutLayerWithOptions, MapWeatherLayer } from '~/types/map';

const store = useStore();

const isOpened = computed(() => !!store.localSettings.filters?.opened);
const selectedFilter = ref<string | null>(null);

const mapLayers: RadioItemGroup<MapLayoutLayerWithOptions>[] = [
    {
        value: 'CartoDB',
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
        hintLocation: 'left',
    },
];

const changeLayer = (layer: MapLayoutLayer) => {
    setUserLocalSettings({ filters: { layers: { layer } } });
};

const weatherLayers: RadioItemGroup<MapWeatherLayer | 'false'>[] = [
    {
        value: 'false',
        text: 'None',
    },
    {
        value: 'clouds_new',
        text: 'Clouds',
        hint: 'Clouds may look poorly, especially in light theme',
        hintLocation: 'right',
    },
    {
        value: 'precipitation_new',
        text: 'Precipitation',
    },
    {
        value: 'wind_new',
        text: 'Wind',
    },
];
</script>

<style scoped lang="scss">
.filters {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 16px;

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
}
</style>
