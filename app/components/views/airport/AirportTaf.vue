<template>
    <div
        v-if="tafData"
        class="__info-sections"
    >
        <common-copy-info-block :text="taf || data.airport?.taf"/>
        <div
            v-for="(tafMetar, index) in tafData.forecast"
            :key="index"
            class="__info-sections"
        >
            <div class="__info-sections_title">
                Entry #{{ index + 1 }}
                <template v-if="tafMetar.type">
                    ({{ tafMetar.type }})
                </template>
            </div>
            <common-copy-info-block
                auto-expand
                :text="tafMetar.raw"
            />
            <airport-metar-blocks :metar="tafMetar"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import AirportMetarBlocks from '~/components/views/airport/AirportMetarBlocks.vue';
import { parseTAFAsForecast } from 'metar-taf-parser';
import { injectAirport } from '~/composables/airport';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';

const props = defineProps({
    taf: {
        type: String,
        default: null,
    },
});

const data = injectAirport();

const tafData = computed(() => {
    if (!props.taf && !data.value.airport?.taf) return;
    return parseTAFAsForecast(props.taf || data.value.airport!.taf!, {
        issued: new Date(),
    });
});
</script>
