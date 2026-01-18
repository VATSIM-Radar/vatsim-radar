<template>
    <popup-overlay
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
                    <ui-spoiler
                        is-cid
                        type="pilot"
                    >
                        ({{ props.overlay?.data.prefile.cid }})
                    </ui-spoiler>
                </div>
                <ui-bubble
                    v-if="props.overlay.data.prefile.flight_plan.flight_rules !== 'I'"
                    class="pilot-header_type"
                    size="M"
                >
                    VFR
                </ui-bubble>
            </div>
        </template>
        <template #plan>
            <pilot-overlay-flight-plan :flight-plan="props.overlay?.data.prefile.flight_plan"/>
        </template>
        <template #actions>
            <ui-button-group>
                <ui-button
                    :href="`https://stats.vatsim.net/stats/${ props.overlay?.data.prefile.cid }`"
                    target="_blank"
                >
                    <template #icon>
                        <stats-icon/>
                    </template>
                    Stats
                </ui-button>
            </ui-button-group>
        </template>
    </popup-overlay>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { StoreOverlayPrefile } from '~/store/map';
import { useMapStore } from '~/store/map';
import PilotOverlayFlightPlan from '~/components/map/overlays/pilot/PilotOverlayFlightPlan.vue';
import type { VatsimPrefile } from '~/types/data/vatsim';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IFetchError } from 'ofetch';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import StatsIcon from '~/assets/icons/kit/stats.svg?component';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPrefile>,
        required: true,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();
const loading = ref(false);

watch(dataStore.vatsim.updateTimestamp, async () => {
    if (loading.value) return;
    try {
        props.overlay.data.prefile = await $fetch<VatsimPrefile>(`/api/data/vatsim/pilot/${ props.overlay.key }/prefile`, {
            timeout: 1000 * 15,
        });
        loading.value = true;
    }
    catch (e: IFetchError | any) {
        if (e) {
            if (e.status === 404) {
                mapStore.overlays = mapStore.overlays.filter(x => x.id !== props.overlay.id);
                await sleep(0);
                const pilot = dataStore.vatsim.data.keyedPilots.value[props.overlay?.data.prefile.cid.toString() ?? ''];
                if (pilot) await mapStore.addPilotOverlay(pilot.cid.toString());
            }
        }
    }
    finally {
        loading.value = false;
    }
});
</script>
