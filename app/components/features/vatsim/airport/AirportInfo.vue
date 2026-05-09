<template>
    <div
        v-if="airportInfo"
        class="__info-sections"
    >
        <ui-data-list
            :grid-columns="3"
            :items="[
                { title: 'ICAO', text: airportInfo.icao },
                { title: 'IATA', text: airportInfo.iata, hide: !airportInfo.iata },
                { title: 'Name', text: airportInfo.name },
                { title: 'Country', text: airportInfo.country },
                { title: 'City', text: airportInfo.city },
                { title: 'Division', text: airportInfo.division_id },
                { title: 'Elevation', text: `${ airportInfo.altitude_m }m, ${ airportInfo.altitude_ft }ft` },
                { title: 'Transition Level', text: airportInfo.transition_level },
                { title: 'Transition Altitude', text: airportInfo.transition_alt },
            ]"
        />
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/vatsim/airport';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';

const data = injectAirport();

const airportInfo = computed(() => data.value.airport?.vatInfo);
</script>
