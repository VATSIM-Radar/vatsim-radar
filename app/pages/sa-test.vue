<template>
    <ui-page-container class="oe-test">
        <template #title>
            OE integration test
        </template>
        <ui-radio-group
            v-model="airports"
            class="oe-test_inputs"
            :items="selects"
            two-cols
        /><br>
        <iframe
            class="oe-test_iframe"
            :src="getUrl"
        />
    </ui-page-container>
</template>

<script setup lang="ts">
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';

type IframeVariants = 'all' | 'oedf' | 'oerk' | 'oema' | 'oejn';

const airports = ref<IframeVariants>('all');
const selects: RadioItemGroup<IframeVariants>[] = [
    {
        text: 'All',
        value: 'all',
    },
    {
        text: 'OEDF',
        value: 'oedf',
    },
    {
        text: 'OERK',
        value: 'oerk',
    },
    {
        text: 'OEMA',
        value: 'oema',
    },
    {
        text: 'OEJN',
        value: 'oejn',
    },
];

const getUrl = computed(() => {
    const params = new URLSearchParams();
    params.set('preset', 'sa');
    params.set('airports', Object.values(selects).filter(x => x.value !== 'all').map(x => x.value.toUpperCase()).join(','));

    if (airports.value !== 'all') {
        params.set('airport', airports.value);
    }

    return `/?${ params.toString() }`;
});
</script>

<style scoped lang="scss">
.oe-test {
    &_inputs {
        display: inline-grid;
    }

    &_iframe {
        width: 100%;
        height: 70dvh;
        margin-top: 16px;
        border: none;

        appearance: none;
    }
}
</style>
