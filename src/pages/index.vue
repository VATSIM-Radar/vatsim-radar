<template>
    <div class="map">
        <div class="map_container" ref="mapContainer"/>

        <template v-if="ready">
            <div class="pilots" v-show="false">
                <div
                    class="pilot"
                    v-for="(pilot) in dataStore.vatsim.data!.pilots"
                    :key="pilot.cid"
                    :data-coordinates="JSON.stringify([pilot.longitude, pilot.latitude])"
                    :style="{
                        '--heading': `${pilot.heading}deg`
                    }"
                    ref="pilots"
                >
                    <airplane-icon/>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import type { VatsimLiveData } from '~/types/data/vatsim';
import AirplaneIcon from '@/assets/airplane.svg?component';
import 'leaflet/dist/leaflet.css';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';

const mapContainer = ref<HTMLDivElement | null>(null);
const pilots = ref<HTMLDivElement[]>([]);
const ready = ref(false);
const dataStore = useDataStore();

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
            const [vatsimData] = await Promise.all([
                $fetch<VatsimLiveData>('/data/vatsim/data'),
            ]);
            dataStore.vatsim.data = vatsimData;
        }()),
    ]);

    interval = setInterval(async () => {
        dataStore.versions = await $fetch('/data/versions');
        if (dataStore.versions?.vatsim.data !== dataStore.vatsim.data?.general.update_timestamp) {
            dataStore.vatsim.data = Object.assign(dataStore.vatsim.data ?? {}, await $fetch<VatsimLiveData>(`/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`));
            dataStore.vatsim.data.general.update_timestamp = dataStore.versions!.vatsim.data;
        }
    }, 1000);

    ready.value = true;

    const L = await import('leaflet');
    const map = L.map(mapContainer.value!, {
        center: [37.617633, 55.755820],
        zoom: 6,
        preferCanvas: true,
        zoomControl: false,
        trackResize: true,
        worldCopyJump: true,
        maxBounds: [[180, -1000000], [-180, 1000000]],
    });

    L.tileLayer(`https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png`, { //style URL
        tileSize: 256,
        minZoom: 2,
        attribution: '\u0026copy; OpenStreetMap contributors\u003C/a\u003E',
        crossOrigin: true,
    }).addTo(map);

    L.geoJson(dataStore.vatsim.data!.firs.flatMap(x => x.firs.map(x => ({
        ...x.feature,
        properties: {
            ...x.feature.properties ?? {},
            name: x.icao,
        },
    }))), {
        onEachFeature: function (feature, layer) {
            layer.bindPopup(feature.properties.name);
        },
    }).addTo(map);

    pilots.value.forEach((x) => {
        const coords = JSON.parse(x.dataset.coordinates!).reverse();

        L.marker(coords, {
            icon: L.divIcon({
                html: x,
                iconSize: [20, 26],
                className: 'map__leaflet-icon',
            }),
            zIndexOffset: 1,
        }).addTo(map);
    });
});

onBeforeUnmount(() => {
    if (interval) {
        clearInterval(interval);
    }
});

await useAsyncData(async () => {
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
        background: #000;
    }

    :deep(.pilot) {
        width: 20px;
        color: forestgreen;
        border-radius: 20px 20px 5px 5px;
        transform: rotate(var(--heading));
        transform-origin: center;
    }

    :deep(.map__leaflet-icon) {
        background: transparent !important;
        border: none !important;
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
