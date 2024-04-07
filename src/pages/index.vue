<template>
    <div class="map">
        <div class="map_container" ref="mapContainer"/>
        <template v-if="ready">
            <map-aircraft
                v-for="aircraft in dataStore.vatsim.data?.pilots"
                :key="aircraft.cid"
                :aircraft="aircraft"
                :is-hovered="hoveredAircraft === aircraft.cid"
                :show-label="showAircraftLabel.includes(aircraft.cid)"
                @manualHover="[isManualHover = true, hoveredAircraft = aircraft.cid]"
                @manualHide="[isManualHover = false, hoveredAircraft = null]"
            />
            <map-sector
                v-for="(sector, index) in dataStore.vatspy?.data.firs"
                :key="sector.feature.id as string + index"
                :feature="sector.feature"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import type { VatsimLiveData, VatsimShortenedAircraft } from '~/types/data/vatsim';
import '@@/node_modules/ol/ol.css';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import { Map, View } from 'ol';
import { XYZ } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Attribution } from 'ol/control';
import { Fill, Stroke, Style } from 'ol/style';
import type { Pixel } from 'ol/pixel';

const mapContainer = ref<HTMLDivElement | null>(null);
const map = shallowRef<Map | null>(null);
const ready = ref(false);
const dataStore = useDataStore();
const vectorSource = shallowRef<VectorSource | null>(null);
const hoveredAircraft = ref<number | null>(null);
const isManualHover = ref(false);
const showAircraftLabel = ref<number[]>([]);

provide('vector-source', vectorSource);
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

    map.value = new Map({
        target: mapContainer.value!,
        controls: [
            new Attribution({
                collapsible: false,
                collapsed: false,
            }),
        ],
        layers: [
            new TileLayer({
                source: new XYZ({
                    attributions: '© <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
                    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
                }),
            }),
        ],
        view: new View({
            center: fromLonLat([37.617633, 55.755820]),
            zoom: 2,
        }),
    });

    vectorSource.value = new VectorSource({
        features: [],
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource.value,
        style: function (feature) {
            if (feature.getGeometry()?.getType() !== 'MultiPolygon') return;

            const type = feature.getProperties().type;

            if (type === 'default') {
                return new Style({
                    stroke: new Stroke({
                        color: '#2d2d30',
                        width: 1,
                    }),
                    zIndex: 1,
                });
            }
            else if (type === 'local') {
                return new Style({
                    fill: new Fill({
                        color: 'rgba(89, 135, 255, 0.07)',
                    }),
                    stroke: new Stroke({
                        color: '#3B6CEC',
                        width: 1,
                    }),
                    zIndex: 3,
                });
            }
            else if (type === 'root') {
                return new Style({
                    fill: new Fill({
                        color: 'rgba(230, 230, 235, 0.05)',
                    }),
                    stroke: new Stroke({
                        color: '#272878',
                        width: 1,
                    }),
                    zIndex: 2,
                });
            }
        },
    });

    map.value.addLayer(vectorLayer);

    function getPilotsForPixel(pixel: Pixel, tolerance = 15) {
        const overlaysCoordinates: number[][] = [];

        map.value!.getOverlays().forEach((overlay) => {
            if ([...overlay.getElement()?.classList ?? []].some(x => x.includes('aircraft'))) return;
            const position = overlay.getPosition();
            if (position) {
                overlaysCoordinates.push(map.value!.getPixelFromCoordinate(position));
            }
        });

        return dataStore.vatsim.data?.pilots.filter((x) => {
            const pilotPixel = aircraftCoordsToPixel(x);

            return Math.abs(pilotPixel[0] - pixel[0]) < tolerance &&
                Math.abs(pilotPixel[1] - pixel[1]) < tolerance &&
                !overlaysCoordinates.some(x => Math.abs(pilotPixel[0] - x[0]) < tolerance && Math.abs(pilotPixel[1] - x[1]) < tolerance);
        }) ?? [];
    }

    function aircraftCoordsToPixel(aircraft: VatsimShortenedAircraft) {
        return map.value!.getPixelFromCoordinate(fromLonLat([aircraft.longitude, aircraft.latitude]));
    }

    //TODO: turn this off on non-PC devices
    map.value.on('pointermove', function (e) {
        const eventPixel = map.value!.getEventPixel(e.originalEvent);

        const features = getPilotsForPixel(eventPixel) ?? [];

        if (features.length !== 1) {
            if (!isManualHover.value) {
                hoveredAircraft.value = null;
            }
            map.value!.getTargetElement().style.cursor = '';
            return;
        }

        if (isManualHover.value) return;

        isManualHover.value = false;

        if (getPilotsForPixel(aircraftCoordsToPixel(features[0])).length === 1) {
            hoveredAircraft.value = features[0].cid;
            map.value!.getTargetElement().style.cursor = 'pointer';
        }
    });

    map.value.on('moveend', function (e) {
        const extent = map.value?.getView().calculateExtent(map.value.getSize());
        if (!extent) return;

        const features = dataStore.vatsim.data?.pilots.filter((x) => {
            const coordinates = fromLonLat([x.longitude, x.latitude]);

            return coordinates[0] > extent[0] && coordinates[0] < extent[2] && coordinates[1] > extent[1] && coordinates[1] < extent[3];
        }) ?? [];

        if (features.length > 200 || features.length === 0) {
            if (showAircraftLabel.value.length) {
                showAircraftLabel.value = [];
            }
            return;
        }

        showAircraftLabel.value = features.filter(feature => getPilotsForPixel(aircraftCoordsToPixel(feature)).length === 1).map(x => x.cid);
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
