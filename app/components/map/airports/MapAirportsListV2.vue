<script setup lang="ts">
import { injectMap } from '~/composables/map';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { MapAirportRender, MapAirportVatspy } from '~/types/map';
import { getRenderAirportsList, getInitialAirportsList } from '~/composables/render/airports';
import type { AirportListItem } from '~/composables/render/airports';
import { useUpdateCallback } from '~/composables';
import { setMapAirports } from '~/composables/render/airports/layers/airport';
import { globalMapEntities } from '~/utils/map/entities';
import { setMapGatesRunways } from '~/composables/render/airports/layers/gates';
import type { AmdbLayerName } from '@navigraph/amdb';
import { airportLayoutStyles } from '~/composables/navigraph/layouts';
import { setMapNavigraphLayout } from '~/composables/render/airports/layers/layout';

defineOptions({
    render: () => null,
});

export type AirportNavigraphData = Record<string, NavigraphAirportData>;

const store = useStore();
const mapStore = useMapStore();
const map = injectMap();
const navigraphData = shallowRef<Record<string, NavigraphAirportData>>({});

let airportsLayer: VectorLayer<any>;
let airportsSource: VectorSource;

let traconsLayer: VectorLayer<any>;
let traconsSource: VectorSource;

let navigraphLayer: VectorLayer<any>;
let navigraphSource: VectorSource;

let gatesLayer: VectorLayer<any>;
let gatesSource: VectorSource;

const now = new Date();
const end = ref(new Date());
const mapSettings = computed(() => store.mapSettings);

const airportsList = shallowRef<MapAirportRender[]>([]);
const visibleAirports = shallowRef<MapAirportVatspy[]>([]);
const airports = shallowRef<AirportListItem[]>([]);

watch(mapSettings, val => {
    const currentDate = new Date();
    currentDate.setTime(now.getTime() + ((((val.bookingHours ?? 0.5) * 60) * 60) * 1000));
    end.value = currentDate;
}, {
    immediate: true,
});

const getShownAirports = computed(() => {
    let list = airports.value.filter(x => airportsList.value.some(y => y.airport.icao === x.airport.icao || x.bookings.length > 0));

    switch (store.mapSettings.airportsMode) {
        case 'staffedOnly':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.airport.icao || y.data.pilot.flight_plan?.arrival === x.airport.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.airport.icao) || x.arrAtc.length || x.localAtc.length;
            });
            break;
        case 'staffedAndGroundTraffic':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.airport.icao || y.data.pilot.flight_plan?.arrival === x.airport.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.airport.icao) || x.arrAtc.length || x.localAtc.length || x.aircraftList.groundArr?.length || x.aircraftList.groundDep?.length;
            });
            break;
    }

    return list;
});

const updateRelatedSettings = computed(() => String(store.mapSettings.navigraphLayers?.disable) + String(store.mapSettings.navigraphLayers?.gatesFallback) + String(store.mapSettings.airportsMode));

onMounted(() => {
    if (!map.value) throw new Error('Map is not initialized');

    airportsSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    globalMapEntities.airports = airportsSource;

    traconsSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    navigraphSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    gatesSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    airportsLayer = new VectorLayer<any>({
        source: airportsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS,
        properties: {
            type: 'airports',
        },
        declutter: 'airports',
    });

    traconsLayer = new VectorLayer<any>({
        source: traconsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_TRACONS,
        properties: {
            type: 'airports-tracons',
        },
    });

    const styles = airportLayoutStyles();

    navigraphLayer = new VectorLayer<any>({
        source: navigraphSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_NAVIGRAPH,
        declutter: true,
        properties: {
            type: 'airports-navigraph',
        },
        minZoom: 12,
        style: function(feature) {
            const type = feature.getProperties().type as AmdbLayerName;
            if ((type === 'taxiwayintersectionmarking' || type === 'taxiwayguidanceline' || type === 'deicingarea' || type === 'finalapproachandtakeoffarea') && mapStore.preciseZoom < 14.5) return;

            const style = styles[type];

            if (typeof style === 'function') return style(feature as any);

            return style;
        },
    });

    gatesLayer = new VectorLayer<any>({
        source: gatesSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_GATES,
        minZoom: 15,
        declutter: 'gates',
        properties: {
            type: 'airports-gates',
        },
    });

    map.value.addLayer(airportsLayer);
    map.value.addLayer(traconsLayer);
    map.value.addLayer(navigraphLayer);
    map.value.addLayer(gatesLayer);

    useUpdateCallback(['short', 'extent', updateRelatedSettings], async newValue => {
        const result = await getInitialAirportsList({ navigraphData, source: airportsSource, map: map.value! });
        if (!result) return;
        airportsList.value = result.all;
        visibleAirports.value = result.visible;
    }, {
        immediate: true,
    });

    const mapSettings = computed(() => store.mapSettings);
    const mapRender = computed(() => mapStore.renderedAirports.length === 0);

    watch([airportsList, mapSettings, mapRender], async () => {
        airports.value = await getRenderAirportsList({ airports: airportsList.value, visibleAirports: visibleAirports.value });

        setMapAirports({
            airports: getShownAirports.value,
            layer: airportsLayer,
            source: airportsSource,
        });

        setMapGatesRunways({
            airports: getShownAirports.value,
            layer: gatesLayer,
            source: gatesSource,
            navigraphData: navigraphData.value,
        });

        setMapNavigraphLayout({
            airports: getShownAirports.value,
            layer: navigraphLayer,
            source: navigraphSource,
            navigraphData: navigraphData.value,
        });
    });
});

// TODO can be useful for BARS v2
/* watch(dataStore.vatsim.data.bars, val => {
  if (!Object.keys(val).length) return;
  airportLayerSource.value?.dispatchEvent('change');
});*/

onBeforeUnmount(() => {
    airportsLayer?.dispose();
    traconsLayer?.dispose();
    navigraphLayer?.dispose();
    gatesLayer?.dispose();

    airportsSource?.clear();
    globalMapEntities.airports = null;
    traconsSource?.clear();
    navigraphSource?.clear();
    gatesSource?.clear();

    map.value?.removeLayer(airportsLayer);
    map.value?.removeLayer(traconsLayer);
    map.value?.removeLayer(navigraphLayer);
    map.value?.removeLayer(gatesLayer);
});
</script>
