<template>
    <div>
        <slot/>
    </div>
</template>

<script lang="ts" setup>
import { useAsyncData } from '#app';
import { initClientDB } from '~/utils/client-db';

await useAsyncData(async () => {
    if (!import.meta.client) return;
    await initClientDB();
});
</script>

<style lang="scss">
html, body {
    padding: 0;
    margin: 0;
    font-family: Arial, sans-serif;
    color: #fff;
}
</style>
