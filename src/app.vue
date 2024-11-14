<template>
    <nuxt-layout>
        <nuxt-page @map="setMap"/>
    </nuxt-layout>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { Map } from 'ol';
import type { WatchStopHandle } from 'vue';

const store = useStore();
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

function setWindowStore() {
    store.isMobile = window.innerWidth < 700;
    store.isMobileOrTablet = window.innerWidth < 1366;
    store.isTablet = window.innerWidth < 1366 && window.innerWidth >= 700;
    store.isPC = window.innerWidth >= 1366;
    store.scrollbarWidth = window.innerWidth - document.documentElement.offsetWidth;
}

const listener = () => {
    store.viewport.width = window.innerWidth;
    setWindowStore();
};

onNuxtReady(() => {
    document.addEventListener('resize', listener);

    setWindowStore();
    const interval = setInterval(setWindowStore, 500);

    onBeforeUnmount(() => clearInterval(interval));
});

onBeforeUnmount(() => {
    document.removeEventListener('resize', listener);
});

const headers = useRequestHeaders(['user-agent']);

await useAsyncData('default-init', async () => {
    if (headers?.['user-agent'] && import.meta.server) {
        const { UAParser } = await import('ua-parser-js');
        const browser = new UAParser(headers['user-agent'] || '');
        const type = browser.getDevice().type;
        let parsedType: 'tablet' | 'mobile' | undefined;

        switch (type) {
            case 'mobile':
            case 'wearable':
                parsedType = 'mobile';
                break;
            case 'tablet':
                parsedType = 'tablet';
                break;
        }

        store.isMobile = parsedType === 'mobile';
        store.isTablet = parsedType === 'tablet';
        store.isMobileOrTablet = store.isMobile || store.isTablet;
        store.isPC = !store.isMobile && !store.isTablet;
    }

    return true;
});
</script>
