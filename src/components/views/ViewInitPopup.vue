<template>
    <common-popup
        model-value
        width="600px"
    >
        <template #title>
            VATSIM Radar initialization
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { VRInitStatus } from '~/store';
import type { PartialRecord } from '~/types';

const store = useStore();
const dataStore = useDataStore();

const shownKeys: PartialRecord<keyof VRInitStatus, {
    title: string;
}> = {
    updatesCheck: {
        title: 'Checking for updates...',
    },
    dataGet: {
        title: 'Initial data get',
    },
    vatspy: {
        title: 'VATSpy data',
    },
    simaware: {
        title: 'SimAware TRACON',
    },
    vatglasses: {
        title: 'VATGlasses',
    },
    airlines: {
        title: 'Airlines and VA data',
    },
    navigraph: {
        title: 'Navigraph Data',
    },
};
</script>

<style scoped lang="scss">
.init {

}
</style>
