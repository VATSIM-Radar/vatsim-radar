<template>
    <div
        v-if="altimeter || metar.wind || metar.visibility"
    >
        <ui-data-list
            :grid-columns="3"
            :items="[
                { title: 'QNH', text: altimeter, hide: !altimeter },
                { title: 'Valid', key: 'valid', hide: !('start' in metar) },
                { title: 'Wind', key: 'wind', hide: !metar.wind },
                { title: 'Visibility', key: 'visibility', hide: !metar.visibility },
            ]"
        >
            <template
                v-if="'start' in metar"
                #item-valid
            >
                {{
                    `0${ metar.start.getUTCHours() }`.slice(-2)
                }}:{{ `0${ metar.start.getUTCMinutes() }`.slice(-2) }}Z to
                <template v-if="metar.type !== 'BECMG'">
                    {{
                        `0${ metar.end.getUTCHours() }`.slice(-2)
                    }}:{{ `0${ metar.end.getUTCMinutes() }`.slice(-2) }}Z
                </template>
                <template v-else>
                    {{
                        `0${ metar.by.getUTCHours() }`.slice(-2)
                    }}:{{ `0${ metar.by.getUTCMinutes() }`.slice(-2) }}Z
                </template>
            </template>
            <template
                v-if="metar.wind"
                #item-wind
            >
                {{ typeof metar.wind.degrees === 'number' ? `${ metar.wind.degrees }°` : metar.wind.direction }} at {{ metar.wind.speed }} {{ metar.wind.unit || 'MPS' }}
            </template>
            <template
                v-if="metar.visibility"
                #item-visibility
            >
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
        </ui-data-list>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { AltimeterUnit, ValueIndicator } from 'metar-taf-parser';
import type { Forecast, IMetar, IMetarDated } from 'metar-taf-parser';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';

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
