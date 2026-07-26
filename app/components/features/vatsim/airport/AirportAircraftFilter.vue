<template>
    <popup-aside
        v-model="aircraftGroundFilterOpened"
        center-by="start"
        :center-by-offset="isRelative ? '0' : '5%'"
        close-by-click-outside
        :location="isRelative ? 'left' : 'top'"
        :width="isRelative ? '300px' : '90%'"
    >
        <template #title>
            Filter ground aircraft
        </template>
        <ui-radio-group
            v-model="aircraftGroundMode"
            class="airport__ground-toggles"
            :items="aircraftGroundSelects"
        />
    </popup-aside>
</template>

<script setup lang="ts">
import PopupAside from '~/components/popups/PopupAside.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import type { AircraftGroundMode } from '~/components/features/vatsim/airport/AirportAircraft.vue';
import type { PropType } from 'vue';

defineProps({
    isRelative: {
        type: Boolean,
        default: false,
    },
});

const aircraftGroundMode = defineModel({ type: String as PropType<AircraftGroundMode>, required: true });
const aircraftGroundFilterOpened = defineModel('opened', { type: Boolean, required: true });

const aircraftGroundSelects: RadioItemGroup<AircraftGroundMode>[] = [
    {
        text: 'Departing & Arrived',
        value: 'depArr',
    },
    {
        text: 'Departing',
        value: 'dep',
    },
    {
        text: 'Arrived',
        value: 'arr',
    },
    {
        text: 'Prefiles',
        value: 'prefiles',
    },
];
</script>
