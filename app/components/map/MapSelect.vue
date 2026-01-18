<template>
    <map-html-overlay
        class="select-result"
        :model-value="!!eventGroupType && !!lastCoords"
        :settings="{
            position: lastCoords!,
        }"
        :z-index="20"
        @update:overlay="!$event && (eventGroupType = null)"
    >
        {{features.map(x => x.getProperties())}}
    </map-html-overlay>
</template>

<script lang="ts" setup>
import type { ShallowRef } from 'vue';
import { Collection } from 'ol';
import type { Feature, Map } from 'ol';
import Select from 'ol/interaction/Select';
import { singleClick, always } from 'ol/events/condition.js';
import type { PartialRecord } from '~/types';
import { handleAircraftClick } from '~/composables/vatsim/events';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import type { Coordinate } from 'ol/coordinate';

const map = inject<ShallowRef<Map | null>>('map')!;
let select: Select | undefined;
const collection = new Collection<any>();

type EventType = 'click' | 'hover' | 'rightClick';

// TODO: replace to generic features when ready
const features = shallowRef<Feature[]>([]);
const eventGroupType = ref<EventType | null>(null);
const lastCoords = ref<Coordinate | null>(null);

type Definition = {
    click: (feature: Feature) => void;
} & PartialRecord<Exclude<EventType, 'click'>, (feature: Feature) => void>;

const definitions = {
    aircraft: {
        click: handleAircraftClick,
    },
} satisfies Record<string, Definition>;

type SelectableFeatures = keyof typeof definitions;

const priorities: Record<EventType, Array<SelectableFeatures | 'multi'>> = {
    click: ['multi'],
    hover: ['aircraft'],
    rightClick: ['multi'],
};

watch(map, val => {
    if (!val) return;

    if (select) {
        select?.dispose();
        map.value?.removeInteraction(select);
    }

    select = new Select({
        addCondition: singleClick,
        toggleCondition: always,
        multi: true,
        hitTolerance: 4,
        features: collection,
    });

    select.on('select', () => {
        console.log(collection.getLength());
    });

    map.value?.addInteraction(select);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (select) {
        select?.dispose();
        map.value?.removeInteraction(select);
    }
});
</script>

<style lang="scss" scoped>
.select-result {

}
</style>
