<template>
    <client-only>
        <view-map @map="$emit('map', $event)"/>
    </client-only>
</template>

<script setup lang="ts">
import type { MapEvent } from '~/app.vue';

defineEmits({
    map(data: MapEvent) {
        return true;
    },
});

const ViewMap = defineAsyncComponent(() => import('~/components/views/ViewMap.vue'));

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
