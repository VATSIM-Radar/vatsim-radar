<template>
    <div
        v-if="airportInfo"
        class="__info-sections"
    >
        <ui-text
            v-if="localTime"
            class="airport__time"
            type="3b"
        >
            Local time: <ui-chip>{{localTime}}</ui-chip>
        </ui-text>

        <ui-data-list
            :grid-columns="1"
            :items="[
                { title: 'Name', text: airportInfo.name },
            ]"
        />
        <ui-data-list
            :grid-columns="3"
            :items="[
                { title: 'ICAO', text: airportInfo.icao },
                { title: 'IATA', text: airportInfo.iata, hide: !airportInfo.iata },
                { title: 'Country', text: airportInfo.country },
                { title: 'City', text: airportInfo.city },
                { title: 'Division', text: airportInfo.division_id },
                { title: 'Elevation', text: `${ airportInfo.altitude_m }m, ${ airportInfo.altitude_ft }ft` },
                { title: 'Transition Level', text: airportInfo.transition_level },
                { title: 'Transition Altitude', text: airportInfo.transition_alt },
                { title: 'CTAF', text: airportInfo.ctafFreq, hide: !airportInfo.ctafFreq },
                { title: 'Magnetic Declination', text: decl, hide: !decl },
            ]"
        />
        <airport-sun-times/>
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/vatsim/airport';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
// @ts-expect-error JS-only lib
import { magvar } from 'magvar';
import UiText from '~/components/ui/text/UiText.vue';
import AirportSunTimes from '~/components/features/vatsim/airport/AirportSunTimes.vue';
import { useAirportTime } from '~/composables/vatsim/airport-time';

const data = injectAirport();

const airportInfo = computed(() => data.value.airport?.vatInfo);
const { vatAirport, localTime } = useAirportTime();
const decl = computed(() => vatAirport.value ? Math.round(magvar(vatAirport.value.lat, vatAirport.value.lon)) : null);
</script>

<style lang="scss" scoped>
.airport__time {
    display: flex;
    gap: 4px;
    align-items: center;
}
</style>
