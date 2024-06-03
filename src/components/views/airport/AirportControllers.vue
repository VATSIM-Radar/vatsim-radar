<template>
    <div v-if="atc.length">
        <common-toggle
            v-if="!isCtafOnly"
            v-model="showAtis"
        >
            Show ATIS
        </common-toggle>
        <common-button
            v-else
            href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
            target="_blank"
            type="link"
        >
            Learn more about CTAF trial
        </common-button>
        <common-controller-info
            :controllers="atc"
            max-height="170px"
            :show-atis="showAtis"
            show-facility
            small
        />
    </div>
</template>

<script setup lang="ts">
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { injectAirport } from '~/composables/airport';
import type { VatsimShortenedController } from '~/types/data/vatsim';

const data = injectAirport();
const showAtis = ref(false);
const dataStore = useDataStore();

const atc = computed((): VatsimShortenedController[] => {
    const list = sortControllersByPosition([
        ...dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === data.value.icao).map(x => x.atc),
        ...dataStore.vatsim.data.firs.value.filter(x => data.value.airport?.center?.includes(x.controller.callsign)).map(x => x.controller),
    ]);

    if (!list.length && data.value?.airport?.vatInfo?.ctafFreq) {
        return [
            {
                cid: Math.random(),
                callsign: '',
                facility: -2,
                text_atis: null,
                name: '',
                logon_time: '',
                rating: 0,
                visual_range: 0,
                frequency: data.value.airport?.vatInfo?.ctafFreq,
            },
        ];
    }

    return list;
});

const isCtafOnly = computed(() => {
    return atc.value.length === 1 && atc.value[0].facility === -2;
});

defineExpose({ atc });
</script>
