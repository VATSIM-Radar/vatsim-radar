<template>
    <div class="map">
        <yandex-map
            :settings="{
                location: {
                    center: [37.617633, 55.755820],
                    zoom: 4,
                },
                theme: 'dark',
            }"
        >
            <yandex-map-default-features-layer/>
            <yandex-map-spherical-mercator-projection/>
            <yandex-map-tile-data-source :settings="dataSourceProps"/>
            <yandex-map-layer :settings="layerProps"/>

            <div v-if="ready" :key="dataStore.vatsim.data?.general.update_timestamp">
                <yandex-map-feature
                    v-for="(fir) in dataStore.vatspy!.data.firs"
                    :key="fir.name+fir.callsign"
                    :settings="{...fir.feature, hideOutsideViewport: true, style: {zIndex: 1, fillOpacity: 0, stroke: [{color: '#fff', width: 1, opacity: 0.1}]}}"
                />
                <yandex-map-marker
                    v-for="(pilot) in dataStore.vatsim.data!.pilots"
                    :key="pilot.cid"
                    :settings="{coordinates: [pilot.longitude, pilot.latitude], hideOutsideViewport: true}"
                    position="top-center left-center"
                >
                    <div
                        class="pilot"
                        :style="{
                            '--heading': `${pilot.heading}deg`
                        }"
                    >
                        <airplane-icon/>
                    </div>
                </yandex-map-marker>
                <template v-for="(uir, index) in atcBounds" :key="uir.name || index">
                    <yandex-map-feature
                        v-for="(fir) in uir.firs"
                        :key="fir.name+fir.callsign"
                        :settings="{...fir.feature, hideOutsideViewport: true, properties: {hint: fir.callsign || fir.boundary || fir.name || 'nope'}, style: {zIndex: 2, fillOpacity: 0.05}}"
                    />
                </template>
                <yandex-map-hint hint-property="hint">
                    <template #default="{content}">
                        <div class="hint">
                            {{ content }}
                        </div>
                    </template>
                </yandex-map-hint>
            </div>
        </yandex-map>
    </div>
</template>

<script setup lang="ts">
import {
    YandexMap,
    YandexMapDefaultFeaturesLayer,
    YandexMapFeature,
    YandexMapHint,
    YandexMapLayer,
    YandexMapMarker,
    YandexMapSphericalMercatorProjection,
    YandexMapTileDataSource,
} from 'vue-yandex-maps';
import { useDataStore } from '~/store/data';
import type { VatsimData } from '~/types/data/vatsim';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { YMapLayerProps, YMapTileDataSourceProps } from '@yandex/ymaps3-types';
import { useATCBounds } from '~/composables/atc';
import AirplaneIcon from '@/assets/airplane.svg?component';

const ready = ref(false);
const dataStore = useDataStore();
const atcBounds = useATCBounds();

let interval: NodeJS.Timeout | null = null;

const dataSourceProps: YMapTileDataSourceProps = {
    id: 'custom',
    copyrights: ['© OpenStreetMap contributors', '© CartoDB'],
    raster: {
        type: 'ground',
        fetchTile: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{{z}}/{{x}}/{{y}}.png',
    },
    zoomRange: {
        min: 3,
        max: 19,
    },
    clampMapZoom: true,
};
/*
    A text identifier is used to link the data source and the layer.
    Be careful, the identifier for the data source is set in the id field,
    and the source field is used when transferring to the layer
*/
const layerProps: YMapLayerProps = {
    id: 'customLayer',
    source: 'custom',
    type: 'ground',
    options: {
        raster: {
            awaitAllTilesOnFirstDisplay: true,
        },
    },
    zIndex: 0,
};

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
                $fetch<VatsimData>('/data/vatsim/data'),
            ]);
            dataStore.vatsim.data = vatsimData;
        }()),
    ]);

    interval = setInterval(async () => {
        dataStore.versions = await $fetch('/data/versions');
        if (dataStore.versions?.vatsim.data !== dataStore.vatsim.data?.general.update_timestamp) {
            dataStore.vatsim.data = Object.assign(dataStore.vatsim.data ?? {}, await $fetch<VatsimData>(`/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`));
            dataStore.vatsim.data.general.update_timestamp = dataStore.versions!.vatsim.data;
        }
    }, 1000);

    ready.value = true;
});

onBeforeUnmount(() => {
    if (interval) {
        clearInterval(interval);
    }
});

await useAsyncData(async () => {
    if (import.meta.server) {
        const {
            radarStorage,
            isDataReady,
            getDataVersions,
        } = await import('~/utils/backend/storage');
        if (!isDataReady()) return;

        dataStore.vatsim.data = radarStorage.vatsim.data;
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

.pilot {
    width: 20px;
    color: forestgreen;
    border-radius: 20px 20px 5px 5px;
    transform: rotate(var(--heading));
    transform-origin: center;
}
</style>
