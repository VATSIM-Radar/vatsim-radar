<template>
    <nuxt-layout>
        <nuxt-page @map="setMap"/>
    </nuxt-layout>
</template>

<script setup lang="ts">
import type { Map } from 'ol';
import type { WatchStopHandle } from 'vue';
import type LayerGroup from 'ol/layer/Group.js';

const route = useRoute();

let watcher: WatchStopHandle | null = null;
const mapRef = shallowRef<Map | null>(null);
const layerRef = shallowRef<LayerGroup | null>(null);

export type MapEvent = { map: Ref<Map | null>; layerGroup: Ref<LayerGroup | null> };

const setMap = ({ map, layerGroup }: MapEvent) => {
    watcher?.();
    watcher = watch([map, layerGroup], ([map, layer]) => {
        mapRef.value = map;
        layerRef.value = layer;
    });
};

provide('map', mapRef);
provide('layer-group', layerRef);

watch(() => route.path, () => {
    mapRef.value = null;
    layerRef.value = null;
}, {
    flush: 'pre',
});

if (import.meta.server) {
    await useAsyncData('iframe-header', async () => {
        await useIframeHeader();
        return true;
    });
}

async function receiveMessage(event: MessageEvent) {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

    if (data && 'vatsimToken' in data) {
        await $fetch('/api/auth/vatsim/token', {
            method: 'POST',
            body: {
                token: data.vatsimToken,
            },
        });
        location.reload();
    }
}

onMounted(() => {
    window.addEventListener('message', receiveMessage);

    window.parent.postMessage({ status: 'ready' }, '*');
});

onBeforeUnmount(() => {
    window.removeEventListener('message', receiveMessage);
});
</script>
