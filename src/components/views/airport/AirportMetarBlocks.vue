<template>
    <div
        v-if="altimeter || metar.wind || metar.visibility"
        class="__section-group"
    >
        <common-info-block
            v-if="altimeter"
            :bottom-items="[altimeter]"
            text-align="center"
            :top-items="['QNH']"
        />
        <common-info-block
            v-else-if="'start' in metar"
            text-align="center"
            :top-items="['Valid']"
        >
            <template #bottom>
                {{
                    `0${ metar.start.getUTCHours() }`.slice(-2)
                }}:{{ `0${ metar.start.getUTCMinutes() }`.slice(-2) }}Z to {{
                    `0${ metar.end.getUTCHours() }`.slice(-2)
                }}:{{ `0${ metar.end.getUTCMinutes() }`.slice(-2) }}Z
            </template>
        </common-info-block>
        <common-info-block
            v-if="metar.wind"
            text-align="center"
            :top-items="['Wind']"
        >
            <template #bottom>
                {{ typeof metar.wind.degrees === 'number' ? `${ metar.wind.degrees }°` : metar.wind.direction }} at {{ metar.wind.speed }} {{ metar.wind.unit || 'MPS' }}
            </template>
        </common-info-block>
        <common-info-block
            v-if="metar.visibility"
            text-align="center"
            :top-items="['Visibility']"
        >
            <template #bottom>
                <template v-if="metar.visibility.indicator">
                    <template v-if="metar.visibility.indicator === ValueIndicator.GreaterThan">
                        Min
                    </template>
                    <template v-else>
                        Max
                    </template>
                </template>
                {{ metar.visibility.value }} {{ metar.visibility.unit }}
            </template>
        </common-info-block>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { AltimeterUnit, ValueIndicator } from 'metar-taf-parser';
import type { Forecast, IMetar, IMetarDated } from 'metar-taf-parser';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';

const props = defineProps({
    metar: {
        type: Object as PropType<IMetar | IMetarDated | Forecast>,
        required: true,
    },
});

const altimeter = computed(() => {
    if (!('altimeter' in props.metar) || !props.metar.altimeter) return null;

    return `${ props.metar.altimeter?.value } ${ props.metar.altimeter?.unit === AltimeterUnit.HPa ? 'hPa' : 'inHG' }`;
});
</script>
