<template>
    <div
        v-if="metarData"
        class="__info-sections"
    >
        <common-copy-info-block
            auto-expand
            :text="metar || data.airport?.metar"
        />
        <div
            v-if="metarData.hour"
            class="__grid-info-sections"
        >
            <div class="__grid-info-sections_title">
                Issued
            </div>
            <common-info-block class="__grid-info-sections_content">
                <template #top>
                    {{ `0${ metarData.hour }`.slice(-2) }}:{{ `0${ metarData.minute }`.slice(-2) }}Z
                </template>
            </common-info-block>
        </div>
        <div
            v-if="typeof metarData.temperature === 'number'"
            class="__grid-info-sections"
        >
            <div class="__grid-info-sections_title">
                Temp
            </div>
            <common-info-block class="__grid-info-sections_content">
                <template #top>
                    {{ metarData.temperature }}° C / Dew Point {{ metarData.dewPoint }}° C
                </template>
            </common-info-block>
        </div>
        <airport-metar-blocks :metar="metarData"/>
    </div>
</template>

<script setup lang="ts">
import AirportMetarBlocks from '~/components/views/airport/AirportMetarBlocks.vue';
import { injectAirport } from '~/composables/airport';
import { parseMetar } from 'metar-taf-parser';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';

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
