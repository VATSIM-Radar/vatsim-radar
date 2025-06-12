<template>
    <div class="distance"/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';

const map = inject<ShallowRef<Map | null>>('map')!;
const mapStore = useMapStore();
</script>

<style scoped lang="scss">
.distance {

}
</style>
