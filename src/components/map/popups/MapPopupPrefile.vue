<template>
    <common-info-popup
        v-model:collapsed="overlay.collapsed"
        class="fpln"
        collapsible
        max-height="100%"
        model-value
        :sections="[{ key: 'plan' }]"
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
    >
        <template #title>
            <div class="pilot-header">
                <div class="pilot-header_title">
                    {{ props.overlay.data.prefile.callsign }}
                </div>
                <common-blue-bubble
                    v-if="props.overlay.data.prefile.flight_plan.flight_rules !== 'I'"
                    class="pilot-header_type"
                    size="M"
                >
                    VFR
                </common-blue-bubble>
            </div>
        </template>
        <template #plan>
            <map-popup-flight-plan :flight-plan="props.overlay?.data.prefile.flight_plan"/>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { StoreOverlayPrefile } from '~/store/map';
import { useMapStore } from '~/store/map';
import MapPopupFlightPlan from '~/components/map/popups/MapPopupFlightPlan.vue';
import type { VatsimPrefile } from '~/types/data/vatsim';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IFetchError } from 'ofetch';
import CommonBlueBubble from '~/components/common/basic/CommonBlueBubble.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPrefile>,
        required: true,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

watch(dataStore.vatsim.updateTimestamp, async () => {
    try {
        props.overlay.data.prefile = await $fetch<VatsimPrefile>(`/data/vatsim/pilot/${ props.overlay.key }/prefile`);
    }
    catch (e: IFetchError | any) {
        if (e) {
            if (e.status === 404) {
                mapStore.overlays = mapStore.overlays.filter(x => x.id !== props.overlay.id);
                await sleep(0);
                const pilot = dataStore.vatsim.data.pilots.value.find(x => x.cid === props.overlay?.data.prefile.cid);
                if (pilot) mapStore.addPilotOverlay(pilot.cid.toString());
            }
        }
    }
});
</script>
