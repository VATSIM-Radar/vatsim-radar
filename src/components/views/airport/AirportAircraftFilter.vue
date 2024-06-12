<template>
    <common-control-block
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
        <common-radio-group
            v-model="aircraftGroundMode"
            class="airport__ground-toggles"
            :items="aircraftGroundSelects"
        />
    </common-control-block>
</template>

<script setup lang="ts">
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import type { AircraftGroundMode } from '~/components/views/airport/AirportAircraft.vue';
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
