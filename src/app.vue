<template>
    <nuxt-layout>
        <nuxt-page @map="setMap"/>
    </nuxt-layout>
</template>

<script setup lang="ts">
import type { Map } from 'ol';
import type { WatchStopHandle } from 'vue';

const route = useRoute();

let watcher: WatchStopHandle | null = null;
const mapRef = shallowRef<Map | null>(null);

const setMap = (event: Ref<Map | null>) => {
    watcher?.();
    watcher = watch(event, val => mapRef.value = val);
};

provide('map', mapRef);

watch(() => route.path, () => {
    mapRef.value = null;
}, {
    flush: 'pre',
});
</script>
