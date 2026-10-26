<template>
    <map-html-overlay
        v-if="stand"
        model-value
        :settings="{ position: payload.coordinate, stopEvent: true, positioning: 'top-center' }"
        :z-index="20"
        @close="emit('close')"
        @id="emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            class="stand"
            model-value
            open-from="top-center"
            width="280px"
            @update:modelValue="emit('close')"
        >
            <template #title>
                {{ properties?.airport }} / {{ properties?.identifier }}
            </template>
            <template #titleAppend>
                <ui-tooltip
                    align="right"
                    location="bottom"
                    width="240px"
                >
                    {{ hint }}
                </ui-tooltip>
            </template>
            <ui-data-list
                :grid-columns="1"
                :items="items"
            />
        </popup-map-info>
    </map-html-overlay>
</template>

<script setup lang="ts">
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import type { DataListItem } from '~/components/ui/data/UiDataList.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type { FeatureAirportNavigraph } from '~/utils/map/entities';
import { parseStand } from '~/utils/map/stands';

const props = defineProps<{ payload: RadarEventPayload<FeatureAirportNavigraph> }>();
const emit = defineEmits<{ close: []; id: [id: string] }>();

const properties = shallowRef<ReturnType<FeatureAirportNavigraph['getProperties']>>();

// Feature properties are not reactive, so follow OpenLayers changes to keep an open popup up to date
watchEffect(onCleanup => {
    const feature = props.payload.feature;
    const updateProperties = () => {
        properties.value = feature.getProperties();
    };
    updateProperties();
    feature.on('propertychange', updateProperties);
    onCleanup(() => feature.un('propertychange', updateProperties));
});

const stand = computed(() => properties.value && parseStand(properties.value));

const items = computed<DataListItem[]>(() => {
    if (!stand.value) return [];

    const { guidanceLines, prohibitedAircraft, maximumWingspan, approvedAircraft, notes } = stand.value;
    const multipleLines = guidanceLines.length > 1;

    const result: DataListItem[] = guidanceLines.map((line, index) => {
        const title = line.wingspan ? (multipleLines ? 'Max span' : 'Max wingspan') : 'Permanent status';

        return {
            title: multipleLines ? `${ title } (line ${ index + 1 })` : title,
            text: [line.wingspan && `${ line.wingspan } m`, line.status].filter(Boolean).join(' / '),
        };
    });

    if (maximumWingspan) result.push({ title: 'Max wingspan', text: `${ maximumWingspan } m` });
    if (approvedAircraft) result.push({ title: 'Approved aircraft', text: approvedAircraft.length ? approvedAircraft.join(', ') : 'None' });
    if (notes) result.push({ title: 'Restrictions', text: notes });

    if (prohibitedAircraft.length) {
        result.push({
            title: 'Prohibited aircraft',
            text: prohibitedAircraft.join(', '),
        });
    }

    return result;
});

// Single help text for the whole popup, only mentioning rows that are shown
const hint = computed(() => [
    stand.value?.guidanceLines.length && 'Maximum wingspan and permanent status per guidance line. Temporary closures are not included; check current NOTAMs.',
    stand.value?.prohibitedAircraft.length && 'Only published prohibited aircraft are shown.',
    stand.value?.maximumWingspan && 'Maximum permitted wingspan for this stand.',
    stand.value?.approvedAircraft && 'Approved aircraft is an exhaustive list from the source.',
    'Missing restrictions do not mean the stand is unrestricted.',
].filter(Boolean).join(' '));

// Stand data can disappear on refresh - close instead of showing an empty popup
watch(stand, val => {
    if (!val) emit('close');
}, { immediate: true });
</script>

<style scoped lang="scss">
.stand {
    :deep(.list_item) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
        align-items: baseline;
    }
}
</style>
