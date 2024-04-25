<template>
    <div class="map">
        <div class="map_container" ref="mapContainer"/>
        <div class="map_popups">
            <div class="map_popups_list">
                <transition-group name="map_popups_popup--appear">
                    <map-popup
                        class="map_popups_popup"
                        v-for="overlay in store.overlays"
                        :key="overlay.id"
                        :overlay="overlay"
                    />
                </transition-group>
            </div>
        </div>
        <carto-db-layer/>
        <template v-if="ready">
            <map-aircraft-list/>
            <map-sectors-list/>
            <map-airports-list/>
        </template>
    </div>
</template>

<script setup lang="ts">
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
import { setVatsimDataStore } from '~/composables/data';
import type { VatDataVersions } from '~/types/data';
import MapPopup from '~/components/map/popups/MapPopup.vue';
import { setUserLocalSettings } from '~/composables';

const mapContainer = ref<HTMLDivElement | null>(null);
const map = shallowRef<Map | null>(null);
const ready = ref(false);
const store = useStore();
const dataStore = useDataStore();

provide('map', map);

let interval: NodeJS.Timeout | null = null;

onMounted(async () => {
    //Data is not yet ready
    if (!store.dataReady) {
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

    if (!dataStore.versions.value) {
        dataStore.versions.value = await $fetch<VatDataVersions>('/data/versions');
        dataStore.vatsim.updateTimestamp.value = dataStore.versions.value!.vatsim.data;
    }

    const view = new View({
        center: fromLonLat([37.617633, 55.755820]),
        zoom: 2,
        multiWorld: false,
    });

    await Promise.all([
        (async function () {
            let vatspy = await clientDB.get('vatspy', 'index');
            if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
                vatspy = await $fetch<VatSpyAPIData>('/data/vatspy');
                vatspy.data.firs = vatspy.data.firs.map(x => ({
                    ...x,
                    feature: {
                        ...x.feature,
                        geometry: {
                            ...x.feature.geometry,
                            coordinates: x.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromLonLat(x, view.getProjection())))),
                        },
                    },
                }));
                await clientDB.put('vatspy', vatspy, 'index');
            }

            dataStore.vatspy.value = vatspy;
        }()),
        (async function () {
            const [vatsimData] = await Promise.all([
                $fetch<VatsimLiveData>('/data/vatsim/data'),
            ]);
            setVatsimDataStore(vatsimData);
        }()),
    ]);

    interval = setInterval(async () => {
        const versions = await $fetch<VatDataVersions>('/data/versions');

        if (versions && versions.vatsim.data !== dataStore.vatsim.updateTimestamp.value) {
            dataStore.versions.value = versions;

            if (!dataStore.vatsim.data) dataStore.vatsim.data = {} as any;

            const data = await $fetch<VatsimLiveData>(`/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`);
            setVatsimDataStore(data);

            dataStore.vatsim.data.general.value!.update_timestamp = dataStore.versions.value!.vatsim.data;
            dataStore.vatsim.updateTimestamp.value = dataStore.versions.value!.vatsim.data;
        }
    }, 3000);

    ready.value = true;

    const projectionExtent = view.getProjection().getExtent().slice();

    projectionExtent[0] *= 1.2;
    projectionExtent[2] *= 1.2;

    map.value = new Map({
        target: mapContainer.value!,
        controls: [
            new Attribution({
                collapsible: false,
                collapsed: false,
            }),
        ],
        view: new View({
            center: store.localSettings.location ?? fromLonLat([37.617633, 55.755820]),
            zoom: store.localSettings.zoom ?? 3,
            minZoom: 3,
            multiWorld: false,
            extent: projectionExtent,
        }),
    });

    map.value.getTargetElement().style.cursor = 'grab';
    map.value.on('pointerdrag', function () {
        map.value!.getTargetElement().style.cursor = 'grabbing';
    });
    map.value.on('pointermove', function () {
        if (!store.mapCursorPointerTrigger) {
            map.value!.getTargetElement().style.cursor = 'grab';
        }
        else {
            map.value!.getTargetElement().style.cursor = 'pointer';
        }
    });

    store.extent = map.value!.getView().calculateExtent(map.value!.getSize());

    let moving = true;

    map.value.on('movestart', () => {
        moving = true;
        store.moving = true;
    });
    map.value.on('moveend', async () => {
        moving = false;
        const view = map.value!.getView();
        store.zoom = view.getZoom() ?? 0;
        store.extent = view.calculateExtent(map.value!.getSize());

        setUserLocalSettings({
            location: view.getCenter(),
            zoom: view.getZoom(),
        });

        await sleep(300);
        if (moving) return;
        store.moving = false;
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
            } = await import('~/utils/backend/storage');
            if (!isDataReady()) return;

            store.dataReady = true;
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
    width: 100%;
    flex: 1 0 auto;
    display: flex;
    flex-direction: column;
    position: relative;

    &_container {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        z-index: 5;

        :deep(>*) {
            flex: 1 0 auto;
            border-radius: 16px;
        }
    }

    :deep(.ol-attribution) {
        background: $neutral1000;

        ul {
            &, a {
                color: varToRgba('neutral150', 0.2);
            }

            text-shadow: none;

            @include hover {
                a:hover {
                    text-decoration: underline;
                }
            }
        }
    }

    &_popups {
        position: absolute;
        width: calc(100% - 48px);
        max-height: calc(100% - 48px);
        left: 24px;
        top: 24px;
        display: flex;
        justify-content: flex-end;

        &_list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            z-index: 6;
        }

        &_popup {
            &--appear {
                &-enter-active,
                &-leave-active {
                    transition: 0.5s ease-in-out;
                }

                &-enter-from,
                &-leave-to {
                    opacity: 0;
                    transform: translateX(30px);
                }
            }
        }
    }
}
</style>
