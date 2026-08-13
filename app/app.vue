<template>
    <nuxt-layout>
        <nuxt-page @map='setMap'/>
    </nuxt-layout>
</template>

<script setup lang='ts'>
import type { Map } from 'ol';
import type { WatchStopHandle } from 'vue';
import type LayerGroup from 'ol/layer/Group.js';
import { logout } from '~/composables/vatsim/auth';
import { updateCachedProcedures } from '~/composables/navigraph';
import { initDiscordPresenceUpdate } from '~/composables/desktop-app';

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

async function receiveMessage(event: MessageEvent) {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (!data || typeof data !== 'object' || Array.isArray(event.data)) return;

    if (data && 'vatsimToken' in data) {
        await $fetch('/api/auth/vatsim/token', {
            method: 'POST',
            body: {
                token: data.vatsimToken,
            },
        });
        location.reload();
    }

    if (data && 'action' in data && data.action === 'logout') {
        logout();
    }

    // Verify the incoming IPC event is a supported event before processing it.
    const allowedIpcEvents = new Set<string>(['efbX', 'get-bookmarks', 'activate-bookmark', 'get-dashboards', 'activate-dashboard']);
    if ((event.source === window && !allowedIpcEvents.has(data.type)) || event.origin !== useRuntimeConfig().public.DOMAIN) return; // the message is from the same window, so we ignore it

    const settingsStore = useSettingsStore();
    const mapStore = useMapStore();
    const store = useStore();

    if ('selectedPilot' in data) {
        if (data.selectedPilot === null) {
            mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot');
        }
        else {
            mapStore.addPilotOverlay(data.selectedPilot.toString());
        }

        return;
    }

    if ('proceduresUpdate' in data) {
        updateCachedProcedures();

        return;
    }

    if (data.type === 'efbX') {
        store.isTabVisible = event.data.action === 'resume';
        if (store.isTabVisible) store.getVATSIMData(true);
        return;
    }

    if (data.type === 'get-bookmarks') {
        // Bookmarks may not be loaded into the store when this is called. Force them to load
        // before responding to the request.
        if (!store.bookmarks.length) {
            await store.fetchBookmarks().catch(console.error);
        }

        // This only returns the properties required for an external application to display a list
        // of bookmarks then activate one.
        const bookmarkData = store.bookmarks.map(bookmark => ({
            label: bookmark.name,
            id: bookmark.id,
            order: bookmark.order,
        }));
        window.parent.postMessage({ type: 'bookmarks', data: { bookmarks: bookmarkData } }, '*');
    }

    if (data.type === 'get-dashboards') {
        // Dashboards may not be loaded into the store when this is called. Force them to load
        // before responding to the request.
        if (!store.dashboards.length) {
            await store.fetchDashboards().catch(console.error);
        }

        // This only returns the properties required for an external application to display a list
        // of dashboards then activate one.
        const dashboardData = store.dashboards.map(dashboard => ({
            label: dashboard.name,
            id: dashboard.id,
        }));
        window.parent.postMessage({ type: 'dashboards', data: { dashboards: dashboardData } });
    }

    if (data.type === 'activate-bookmark') {
        // The ID of the bookmark to activate.
        const id = data.data.id;

        // Verify the bookmark exists before attempting to activate it.
        const bookmark = store.bookmarks.find(bookmark => bookmark.id === id);

        if (!bookmark) {
            console.warn(`No bookmark matching id ${ id } found`);
            return;
        }

        // If the bookmark was already activated by the query string and the user moved the map,
        // it needs to be cleared from the query string before activating it again otherwise
        // the route doesn't change and the map won't move.
        const current = String(route.query.bookmark ?? '');
        if (current === String(bookmark.id)) {
            await navigateTo({
                path: '/',
                query: {
                    ...route.query,
                    bookmark: undefined,
                },
            });
        }

        await navigateTo({ path: '/', query: { bookmark: bookmark.id } });
    }

    if (data.type === 'activate-dashboard') {
        // The ID of the dashboard to activate.
        const id = data.data.id;

        // Verify the dashboard exists before attempting to activate it.
        const dashboard = store.dashboards.find(dashboard => dashboard.id === id);

        if (!dashboard) {
            console.warn(`No dashboard matching id ${ id } found`);
            return;
        }

        await navigateTo(`/dashboard/${ dashboard.id }`);
    }

    if (data.type === 'settings') {
        settingsStore.save(data.settings, { autoSave: false, overwrite: true, dontSave: true });
    }

    if (data.type === 'navigraph-waypoints') {
        useDataStore().navigraphWaypoints.value = data.waypoints;
    }
}

onMounted(() => {
    window.addEventListener('message', receiveMessage);

    window.parent.postMessage({ status: 'ready' }, '*');

    initDiscordPresenceUpdate();
});

onBeforeUnmount(() => {
    window.removeEventListener('message', receiveMessage);
});
</script>
