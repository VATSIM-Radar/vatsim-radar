<template>
    <div
        v-if="metarData"
        class="__info-sections"
    >
        <ui-copy-info
            auto-expand
            :text="metar || data.airport?.metar"
        />

        <ui-data-list
            :grid-columns="3"
            :items="[
                { title: 'Issued', text: `${ `0${ metarData.hour }`.slice(-2) }:${ `0${ metarData.minute }`.slice(-2) }z` },
                { title: 'Temperature', text: `${ metarData.temperature }° C` },
                { title: 'Dew Point', text: `${ metarData.dewPoint }° C` },
            ]"
        />

        <airport-metar-blocks :metar="metarData"/>
    </div>
</template>

<script setup lang="ts">
import AirportMetarBlocks from '~/components/features/vatsim/airport/AirportMetarBlocks.vue';
import { injectAirport } from '~/composables/vatsim/airport';
import { parseMetar } from 'metar-taf-parser';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';

const props = defineProps({
    metar: {
        type: String,
        default: null,
    },
});

const data = injectAirport();

const metarData = computed(() => {
    if (!props.metar && !data.value?.airport?.metar) return;
    return parseMetar(props.metar || data.value.airport!.metar!, {
        issued: new Date(),
    });
});
</script>
