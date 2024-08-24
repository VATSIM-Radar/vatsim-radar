<template>
    <nuxt-layout>
        <nuxt-page/>
    </nuxt-layout>
</template>

<script setup lang="ts">
import { useStore } from '~/store';

const store = useStore();

const listener = () => {
    store.viewport.width = window.innerWidth;
};

onNuxtReady(() => {
    document.addEventListener('resize', listener);
});

onBeforeMount(() => {
    document.removeEventListener('resize', listener);
});
</script>
