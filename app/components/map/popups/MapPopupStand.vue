<template>
    <map-html-overlay
        v-if="items.length"
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
                <template v-if="properties?.standInformation?.source === 'Synthetic demo data'">
                    TEST -
                </template>
                {{ properties?.airport }} / {{ properties?.identifier }}
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
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type { FeatureAirportNavigraph } from '~/utils/map/entities';

const props = defineProps<{ payload: RadarEventPayload<FeatureAirportNavigraph> }>();
const emit = defineEmits<{ close: []; id: [id: string] }>();

const properties = shallowRef<ReturnType<FeatureAirportNavigraph['getProperties']>>();

watchEffect(onCleanup => {
    const feature = props.payload.feature;
    const updateProperties = () => {
        properties.value = feature.getProperties();
    };
    updateProperties();
    feature.on('propertychange', updateProperties);
    onCleanup(() => feature.un('propertychange', updateProperties));
});

const items = computed<DataListItem[]>(() => {
    const information = properties.value?.standInformation;
    const guidanceLines = Array.isArray(information?.guidanceLines) ? information.guidanceLines.filter(line => line && Number.isInteger(line.id) && line.id >= 0) : [];
    const restrictions = Array.isArray(information?.prohibitedAircraft) ? information.prohibitedAircraft.filter(aircraft => typeof aircraft === 'string' && aircraft.trim()) : [];
    const result: DataListItem[] = [];

    for (const line of guidanceLines) {
        const wingspan = typeof line.maximumWingspan === 'number' && Number.isFinite(line.maximumWingspan) && line.maximumWingspan > 0 ? `${ line.maximumWingspan } m` : null;
        const status = line.status === 'closed' ? 'closed' : line.status === 'open' ? 'open' : null;
        if (!wingspan && !status) continue;
        const title = wingspan ? guidanceLines.length > 1 ? 'Max span' : 'Max wingspan' : 'Permanent status';
        result.push({
            title: guidanceLines.length > 1 ? `${ title } (line ${ line.id })` : title,
            text: [wingspan, status].filter(Boolean).join(' / '),
            tooltip: 'Maximum wingspan and permanent status for this guidance line. Temporary closures are not included; check current NOTAMs.',
            tooltipWidth: '240px',
            tooltipTeleported: true,
        });
    }

    if (restrictions.length) {
        result.push({
            title: 'Prohibited aircraft',
            text: restrictions.join(', '),
            tooltip: 'Only published prohibited aircraft are shown; omitted restrictions do not mean the stand is unrestricted.',
            tooltipWidth: '240px',
            tooltipTeleported: true,
        });
    }

    return result;
});

watch(() => items.value.length, length => {
    if (!length) emit('close');
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
