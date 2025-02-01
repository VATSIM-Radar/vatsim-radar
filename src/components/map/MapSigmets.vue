<template>
    <div class="sigmets"/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import type { Sigmet } from '~/utils/backend/storage';

const { refresh, data } = await useFetch('/api/data/sigmets');
const map = inject<ShallowRef<Map | null>>('map')!;
const openSigmet = ref<Sigmet | null>(null);

const sigmets = computed(() => {
    return data.value ?? [];
});


const jsonFeatures = computed(() => {

});
</script>

<style scoped lang="scss">
.sigmets {

}
</style>
