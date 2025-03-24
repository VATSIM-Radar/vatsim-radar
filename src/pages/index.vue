<template>
    <view-map/>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';

const config = useRuntimeConfig();

useHead(() => ({
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }`,
        },
    ],
}));
</script>
