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
import { getATCForAirport, injectAirport } from '~/composables/airport';

const data = injectAirport();
const showAtis = ref(false);

const atc = getATCForAirport(data);

const isCtafOnly = computed(() => {
    return atc.value.length === 1 && atc.value[0].facility === -2;
});
</script>
