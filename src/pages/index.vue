<template>
    <div class="map">
        <div class="map_container" ref="mapContainer"/>
        <carto-db-layer/>
        <template v-if="ready">
            <map-aircraft-list/>
            <map-sectors-list/>
            <map-airports-list/>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import type { VatsimLiveData } from '~/types/data/vatsim';
import '@@/node_modules/ol/ol.css';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Attribution } from 'ol/control';
import CartoDbLayer from '~/components/map/layers/CartoDbLayer.vue';
import MapSectorsList from '~/components/map/MapSectorsList.vue';
import MapAircraftList from '~/components/map/MapAircraftList.vue';
import { useStore } from '~/store';

const mapContainer = ref<HTMLDivElement | null>(null);
const map = shallowRef<Map | null>(null);
const ready = ref(false);
const store = useStore();
const dataStore = useDataStore();

provide('map', map);

let interval: NodeJS.Timeout | null = null;

onMounted(async () => {
    //Data is not yet ready
    if (!dataStore.versions) {
        await new Promise<void>((resolve) => {
            const interval = setInterval(async () => {
                const { ready } = await $fetch('/data/status');
                if (ready) {
                    resolve();
                    clearInterval(interval);
                }
            }, 1000);
        });
    }

    if (!dataStore.versions) {
        dataStore.versions = await $fetch('/data/versions');
    }

    await Promise.all([
        (async function () {
            let vatspy = await clientDB.get('vatspy', 'index');
            if (!vatspy || vatspy.version !== dataStore.versions!.vatspy) {
                vatspy = await $fetch<VatSpyAPIData>('/data/vatspy');
                await clientDB.put('vatspy', vatspy, 'index');
            }

            dataStore.vatspy = shallowReactive(vatspy);
        }()),
        (async function () {
            if (dataStore.vatsim.data) return;
            const [vatsimData] = await Promise.all([
                $fetch<VatsimLiveData>('/data/vatsim/data'),
            ]);
            dataStore.vatsim.data = shallowReactive(vatsimData);
        }()),
    ]);

    interval = setInterval(async () => {
        dataStore.versions = await $fetch('/data/versions');
        if (dataStore.versions?.vatsim.data !== dataStore.vatsim.data?.general.update_timestamp) {
            dataStore.vatsim.data = Object.assign(dataStore.vatsim.data ?? {}, await $fetch<VatsimLiveData>(`/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`));
            dataStore.vatsim.data.general.update_timestamp = dataStore.versions!.vatsim.data;
        }
    }, 3000);

    ready.value = true;

    const view = new View({
        center: fromLonLat([37.617633, 55.755820]),
        zoom: 2,
        multiWorld: false,
    });

    map.value = new Map({
        target: mapContainer.value!,
        controls: [
            new Attribution({
                collapsible: false,
                collapsed: false,
            }),
        ],
        view: new View({
            center: fromLonLat([37.617633, 55.755820]),
            zoom: 2,
            multiWorld: false,
            extent: view.getProjection().getExtent(),
        }),
    });

    map.value.getTargetElement().style.cursor = 'grab';
    map.value.on('pointerdrag', function() {
        map.value!.getTargetElement().style.cursor = 'grabbing';
    });

    store.extent = map.value!.getView().calculateExtent(map.value!.getSize());
    map.value.on('moveend', () => {
        store.extent = map.value!.getView().calculateExtent(map.value!.getSize());
    });
});

onBeforeUnmount(() => {
    if (interval) {
        clearInterval(interval);
    }
});

await useAsyncData(async () => {
    try {
        if (import.meta.server) {
            const {
                isDataReady,
                getDataVersions,
                getServerVatsimLiveData,
            } = await import('~/utils/backend/storage');
            if (!isDataReady()) return;

            dataStore.vatsim.data = getServerVatsimLiveData();
            dataStore.versions = getDataVersions();
            return true;
        }

        return true;
    }
    catch (e) {
        console.error(e);
    }
});
</script>

<style lang="scss" scoped>
.map {
    width: 100dvw;
    height: 100dvh;
    display: flex;
    flex-direction: column;

    &_container {
        flex: 1 0 auto;
        background: $neutral1000;
    }
}

.hint {
    position: absolute;
    transform: translate(7px, -100%);
    padding: 4px;
    background: white;
    border: 1px solid black;
    opacity: 0.7;
    white-space: nowrap;
}
</style>
