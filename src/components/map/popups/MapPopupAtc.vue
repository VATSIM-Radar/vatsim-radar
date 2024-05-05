<template>
    <common-info-popup
        class="atc"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        max-height="100%"
        :header-actions="['sticky']"
        :sections="[{key: 'data'}]"
    >
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #title>
            <div class="pilot-header">
                <div class="pilot-header_title">
                    {{ props.overlay.data.callsign }}
                </div>
            </div>
        </template>
        <template #data/>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAtc } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAtc>,
        required: true,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

const atc = computed(() => {
    return dataStore.vatsim.data.locals.value.find(x => x.atc.callsign === props.overlay.data.callsign) ||
        dataStore.vatsim.data.firs.value.find(x => x.controller?.callsign === props.overlay.data.callsign || x.firs.some(x => x.controller?.callsign === props.overlay.data.callsign));
});

const close = () => {
    mapStore.overlays = mapStore.overlays.filter(x => x.id !== props.overlay.id);
};

watch(atc, (value) => {
    if (value) return;
    close();
}, {
    immediate: true,
});
</script>

<style scoped lang="scss">

</style>
