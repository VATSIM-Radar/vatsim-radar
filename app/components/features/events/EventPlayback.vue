<template>
    <div v-if="data.data.value?.length" class="playback __vertical-group-16">
        <ui-data-list :items="[{ title: 'Total movements', text: parsedResult.total }, { title: 'Departures', text: parsedResult.departures }, { title: 'Arrivals', text: parsedResult.arrivals }]">
            <template #title="{ item }">
                <ui-text type="1b">
                    {{item.title}}
                </ui-text>
            </template>
            <template #default="{ item }">
                <ui-text type="2b">
                    {{item.text}}
                </ui-text>
            </template>
        </ui-data-list>
        <ui-tabs v-model="selectedAirport" :tabs="Object.fromEntries(Object.entries(parsedResult.airports).map(x => [x[0], { title: x[0] }]))">
            <template #[selectedAirport]>
                <br>
                <ui-data-list
                    :items="[
                        { title: `Movements in ${ selectedAirport }`, text: parsedResult.airports[selectedAirport!].departures.length + parsedResult.airports[selectedAirport!].arrivals.length },
                        { title: `Departures in ${ selectedAirport }`, text: parsedResult.airports[selectedAirport!].departures.length },
                        { title: `Arrivals in ${ selectedAirport }`, text: parsedResult.airports[selectedAirport!].arrivals.length },
                    ]"
                >
                    <template #title="{ item }">
                        <ui-text type="1b">
                            {{item.title}}
                        </ui-text>
                    </template>
                    <template #default="{ item }">
                        <ui-text type="2b">
                            {{item.text}}
                        </ui-text>
                    </template>
                </ui-data-list>
            </template>
        </ui-tabs>
        <div v-if="chartData" :key="store.viewport.width" class="playback_chart">
            <ui-text type="1b">
                Departures / arrivals (UTC)
            </ui-text>
            <div class="playback_chart_canvas">
                <chart-line :data="chartData" :options="chartOptions"/>
            </div>
        </div>
        <div ref="mapContainer" class="map"/>
    </div>
    <ui-notification v-else-if="!data.data.value" type="info">
        Loading event flights...
    </ui-notification>
</template>

<script setup lang="ts">
import '@@/node_modules/ol/ol.css';
import type { VatsimEvent } from '~/types/data/vatsim.ts';
import type { StatsimAircraftDetailed } from '~/utils/server/statsim.ts';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { checkForVATSpy } from '~/composables/init.ts';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import { Map, View } from 'ol';
import { Attribution } from 'ol/control';
import { MAX_MAP_ZOOM } from '~/utils/shared';
import type { Coordinate } from 'ol/coordinate.js';
import TileLayer from 'ol/layer/Tile.js';
import { XYZ } from 'ol/source.js';
import { buildAttributions } from '~/composables/map';
import { useGeographic } from 'ol/proj.js';
import Heatmap from 'ol/layer/Heatmap.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { colorsList } from '~/utils/colors.ts';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line as ChartLine } from 'vue-chartjs';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const dataStore = useDataStore();
const store = useStore();
const selectedAirport = ref('');

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const data = await useLazyAsyncData(async (): Promise<StatsimAircraftDetailed[]> => {
    if (new Date(props.event.end_time).getTime() > Date.now()) return [];

    return await $fetch<StatsimAircraftDetailed[]>(`/api/data/vatsim/events/${ props.event.id }/playback`);
}, {
    server: false,
});

interface Airport {
    departures: number[];
    arrivals: number[];
}

const map = shallowRef<Map | null>(null);
const heatmapSource = new VectorSource<Feature<Point>>();

const parsedResult = computed(() => {
    let departures = 0;
    let arrivals = 0;
    const airports: Record<string, Airport> = Object.fromEntries(props.event.airports.map(x => [x.icao, { departures: [], arrivals: [] } satisfies Airport as Airport]));

    for (const aircraft of data.data.value ?? []) {
        if (airports[aircraft.departure]) {
            airports[aircraft.departure].departures.push(aircraft.id);
            departures++;
        }

        if (airports[aircraft.destination]) {
            if (aircraft.departure !== aircraft.destination) {
                airports[aircraft.destination].arrivals.push(aircraft.id);
            }
            arrivals++;
        }
    }


    return {
        total: data.data.value?.length ?? 0,
        departures,
        arrivals,
        airports,
    };
});

const chartData = computed(() => {
    const airport = parsedResult.value.airports[selectedAirport.value];
    if (!airport) return null;

    const eventDuration = new Date(props.event.end_time).getTime() - new Date(props.event.start_time).getTime();
    if (!Number.isFinite(eventDuration) || eventDuration <= 0) return null;

    const departureIds = new Set(airport.departures);
    const arrivalIds = new Set(airport.arrivals);
    const departureTimes: number[] = [];
    const arrivalTimes: number[] = [];

    for (const flight of data.data.value ?? []) {
        for (const [ids, timestamp, times] of [
            [departureIds, flight.departed, departureTimes],
            [arrivalIds, flight.arrived, arrivalTimes],
        ] as const) {
            if (!ids.has(flight.id) || !timestamp) continue;
            const time = new Date(timestamp).getTime();
            if (Number.isFinite(time)) times.push(time);
        }
    }

    // Anchor the timeline to observed traffic rather than the scheduled event window.
    const start = departureTimes.length ? Math.min(...departureTimes) : Math.min(...arrivalTimes);
    if (!Number.isFinite(start)) return null;

    const end = Math.max(start, ...departureTimes, ...arrivalTimes);
    const binSize = eventDuration < 4 * 60 * 60_000 ? 30 * 60_000 : 60 * 60_000;
    const firstBin = Math.floor(start / binSize) * binSize;
    const count = Math.floor((end - firstBin) / binSize) + 1;
    const departures = Array<number>(count).fill(0);
    const arrivals = Array<number>(count).fill(0);

    for (const time of departureTimes) {
        if (time >= start) departures[Math.floor((time - firstBin) / binSize)]++;
    }
    for (const time of arrivalTimes) {
        if (time >= start) arrivals[Math.floor((time - firstBin) / binSize)]++;
    }

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        ...(new Date(firstBin).getUTCDate() !== new Date(end).getUTCDate() || end - firstBin >= 24 * 60 * 60_000 ? { day: '2-digit', month: '2-digit' } : {}),
        hour: '2-digit',
        minute: '2-digit',
    });

    return {
        labels: Array.from({ length: count }, (_, index) => formatter.format(new Date(firstBin + index * binSize))),
        datasets: [
            {
                label: 'Departures',
                data: departures,
                borderColor: getCurrentThemeHexColor('blue500'),
                backgroundColor: getCurrentThemeHexColor('blue500'),
            },
            {
                label: 'Arrivals',
                data: arrivals,
                borderColor: getCurrentThemeHexColor('orange500'),
                backgroundColor: getCurrentThemeHexColor('orange500'),
            },
        ],
    };
});

const chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { display: true },
    },
    elements: {
        point: { radius: 2 },
        line: { tension: 0.5 },
    },
    scales: {
        x: {
            grid: { color: getCurrentThemeHexColor('darkGray100') },
        },
        y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: getCurrentThemeHexColor('darkGray100') },
        },
    },
}));

const mapContainer = useTemplateRef('mapContainer');

function initMap(center: Coordinate) {
    if (map.value) return;

    useGeographic();

    map.value = new Map({
        target: mapContainer.value!,
        controls: [
            new Attribution({
                collapsible: false,
                collapsed: false,
            }),
        ],
        maxTilesLoading: 1000,
        view: new View({
            center,
            zoom: 7,
            minZoom: 2,
            maxZoom: MAX_MAP_ZOOM,
            multiWorld: true,
        }),
        layers: [
            new TileLayer({
                source: new XYZ({
                    attributions: buildAttributions('OpenStreetMaps', 'https://openstreetmap.org/'),
                    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    wrapX: true,
                    tileSize: 256,
                }),
                cacheSize: 32,
            }),
            new Heatmap({
                source: heatmapSource,
                radius: 3,
                blur: 2,
                gradient: [colorsList.blue500, colorsList.green700, colorsList.yellow500, colorsList.red500],
                weight: () => 0.4,
            }),
        ],
    });

    const targetElement = map.value.getTargetElement()!;
    targetElement.style.cursor = 'grab';

    const pointerDragHandler = () => {
        targetElement.style.cursor = 'grabbing';
    };
    map.value.on('pointerdrag', pointerDragHandler);
}

onBeforeUnmount(() => {
    map.value?.dispose();
    map.value = null;
    heatmapSource.dispose();
});

watch(parsedResult, val => {
    if (selectedAirport.value && val.airports[selectedAirport.value]) return;

    selectedAirport.value = Object.entries(val.airports).reduce((best, [icao, airport]) => {
        const count = airport.departures.length + airport.arrivals.length;
        return count > best.count ? { icao, count } : best;
    }, { icao: '', count: -1 }).icao;
}, { immediate: true });

watch([selectedAirport, data.data], async ([icao, flights], _previous, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
        cancelled = true;
    });

    const airport = parsedResult.value.airports[icao];
    const ids = new Set([...(airport?.departures ?? []), ...(airport?.arrivals ?? [])]);
    const points: Feature<Point>[] = [];

    for (const flight of flights ?? []) {
        if (!ids.has(flight.id)) continue;

        for (const position of flight.positions ?? []) {
            if (!Number.isFinite(position.longitude) || !Number.isFinite(position.latitude) || Math.abs(position.longitude) > 180 || Math.abs(position.latitude) > 90) continue;
            points.push(new Feature(new Point([position.longitude, position.latitude])));
        }
    }

    heatmapSource.clear();
    heatmapSource.addFeatures(points);

    if (!icao || !flights) return;

    await checkForVATSpy();
    await nextTick();
    if (cancelled || !mapContainer.value) return;

    const vatspyAirport = dataStore.vatspy.value?.data.keyAirports.realIcao[icao];
    const center: Coordinate = vatspyAirport ? [vatspyAirport.lon, vatspyAirport.lat] : points[0]?.getGeometry()?.getCoordinates() ?? [0, 0];

    initMap(center);
    map.value?.getView().setCenter(center);
}, { immediate: true });
</script>

<style lang="scss">
.playback_chart {
    width: 100%;

    &_canvas {
        height: 260px;
    }
}

.map {
    width: 100%;
    height: 600px;
}
</style>
