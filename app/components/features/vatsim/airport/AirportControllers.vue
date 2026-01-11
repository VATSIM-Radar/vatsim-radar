<template>
    <div v-if="atc.length">
        <ui-toggle
            v-if="!isCtafOnly"
            v-model="showAtis"
        >
            Show ATIS
        </ui-toggle>
        <ui-button
            v-else
            href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
            target="_blank"
            type="link"
        >
            Learn more about CTAF trial
        </ui-button>
        <vatsim-controllers-list
            :controllers="atc"
            max-height="170px"
            :show-atis="showAtis"
            show-facility
            small
        />
    </div>
</template>

<script setup lang="ts">
import VatsimControllersList from '~/components/features/vatsim/controllers/VatsimControllersList.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { getATCForAirport, injectAirport } from '~/composables/airport';

const data = injectAirport();
const showAtis = ref(false);

const atc = getATCForAirport(data);

const isCtafOnly = computed(() => {
    return atc.value.length === 1 && atc.value[0].facility === -2;
});
</script>
