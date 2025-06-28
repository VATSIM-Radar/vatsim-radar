<template>
    <view-map @map="$emit('map', $event)"/>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';
import type { MapEvent } from '~/app.vue';

defineEmits({
    map(data: MapEvent) {
        return true;
    },
});

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
