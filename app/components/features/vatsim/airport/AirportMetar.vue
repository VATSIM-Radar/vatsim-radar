<template>
    <div
        v-if="metarData"
        class="__info-sections"
    >
        <ui-copy-info
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
            <ui-text-block class="__grid-info-sections_content">
                <template #top>
                    {{ `0${ metarData.hour }`.slice(-2) }}:{{ `0${ metarData.minute }`.slice(-2) }}Z
                </template>
            </ui-text-block>
        </div>
        <div
            v-if="typeof metarData.temperature === 'number'"
            class="__grid-info-sections"
        >
            <div class="__grid-info-sections_title">
                Temp
            </div>
            <ui-text-block class="__grid-info-sections_content">
                <template #top>
                    {{ metarData.temperature }}° C / Dew Point {{ metarData.dewPoint }}° C
                </template>
            </ui-text-block>
        </div>
        <airport-metar-blocks :metar="metarData"/>
    </div>
</template>

<script setup lang="ts">
import AirportMetarBlocks from '~/components/features/vatsim/airport/AirportMetarBlocks.vue';
import { injectAirport } from '~/composables/vatsim/airport';
import { parseMetar } from 'metar-taf-parser';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';

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
