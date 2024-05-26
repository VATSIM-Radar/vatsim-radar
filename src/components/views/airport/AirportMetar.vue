<template>
    <div
        v-if="metar"
        class="__info-sections"
    >
        <common-copy-info-block :text="data.airport?.metar"/>
        <div
            v-if="metar.hour"
            class="__grid-info-sections"
        >
            <div class="__grid-info-sections_title">
                Issued
            </div>
            <common-info-block class="__grid-info-sections_content">
                <template #top>
                    {{ `0${ metar.hour }`.slice(-2) }}:{{ `0${ metar.minute }`.slice(-2) }}Z
                </template>
            </common-info-block>
        </div>
        <div
            v-if="metar.temperature"
            class="__grid-info-sections"
        >
            <div class="__grid-info-sections_title">
                Temp
            </div>
            <common-info-block class="__grid-info-sections_content">
                <template #top>
                    {{ metar.temperature }}° C / Dew Point {{ metar.dewPoint }}° C
                </template>
            </common-info-block>
        </div>
        <airport-metar-blocks :metar/>
    </div>
</template>

<script setup lang="ts">
import AirportMetarBlocks from '~/components/views/airport/AirportMetarBlocks.vue';
import { injectAirport } from '~/composables/airport';
import { parseMetar } from 'metar-taf-parser';

const data = injectAirport();

const metar = computed(() => {
    if (!data.value?.airport?.metar) return;
    return parseMetar(data.value.airport.metar, {
        issued: new Date(),
    });
});
</script>
