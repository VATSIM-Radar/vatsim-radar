<template>
    <ui-data-list
        v-if="sunTimes?.sunrise || sunTimes?.sunset"
        :grid-columns="2"
        :items="[
            { title: sunTimes.sunrise?.polar ? 'Sunrise/Sunset' : 'Sunrise (local)', hide: !sunTimes.sunrise, text: sunTimes.sunrise?.polar ?? sunTimes.sunrise?.local },
            { title: 'Sunrise (UTC)', hide: !sunTimes.sunrise || !!sunTimes.sunrise.polar, text: `${ sunTimes.sunrise?.utc }z` },
            { title: 'Sunset (local)', hide: !sunTimes.sunset, text: sunTimes.sunset?.local },
            { title: 'Sunset (UTC)', hide: !sunTimes.sunset, text: `${ sunTimes.sunset?.utc }z` },
        ]"
    />
</template>

<script setup lang="ts">
import type { VatSpyAirport } from '~/types/data/vatspy';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import { useAirportTime } from '~/composables/vatsim/airport-time';

const props = defineProps<{ airport?: VatSpyAirport | null }>();

const { sunTimes } = useAirportTime(() => props.airport);
</script>
