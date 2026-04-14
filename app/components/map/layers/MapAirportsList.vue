<script setup lang="ts">
import { injectMap } from '~/composables/map';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { MapAirportRender } from '~/types/map';
import { getRenderAirportsList, getInitialAirportsList } from '~/composables/render/airports';
import type { AirportListItem } from '~/composables/render/airports';
import { useUpdateCallback } from '~/composables';
import { setMapAirports } from '~/composables/render/airports/layers/airport';
import { globalMapEntities } from '~/utils/map/entities';
import { setMapGatesRunways } from '~/composables/render/airports/layers/gates';
import type { AmdbLayerName } from '@navigraph/amdb';
import { airportLayoutStyles } from '~/composables/navigraph/layouts';
import { setMapNavigraphLayout } from '~/composables/render/airports/layers/layout';
import { isHideMapObject } from '~/composables/settings';

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

let navigraphLayer: VectorLayer<any>;
let navigraphSource: VectorSource;

let gatesLayer: VectorLayer<any>;
let gatesSource: VectorSource;

const now = new Date();
const end = ref(new Date());
const mapSettings = computed(() => store.mapSettings);

const dataStore = useDataStore();
const airportsList = shallowRef<MapAirportRender[]>([]);
const visibleAirports = shallowRef<DataAirport[]>([]);
const airports = shallowRef<AirportListItem[]>([]);

watch(mapSettings, val => {
    const currentDate = new Date();
    currentDate.setTime(now.getTime() + ((((val.bookingHours ?? 0.5) * 60) * 60) * 1000));
    end.value = currentDate;
}, {
    immediate: true,
});

const getShownAirports = computed(() => {
    const airportsListSet = new Set(airportsList.value.map(x => x.airport.icao));

    let list = airports.value.filter(x => airportsListSet.has(x.icao));

    switch (store.mapSettings.airportsMode) {
        case 'staffedOnly':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.icao || y.data.pilot.flight_plan?.arrival === x.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.icao) || x.atc.length;
            });
            break;
        case 'staffedAndGroundTraffic':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.icao || y.data.pilot.flight_plan?.arrival === x.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.icao) || x.atc.length || x.aircraft.groundArr?.length || x.aircraft.groundDep?.length;
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

    navigraphSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    gatesSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    airportsLayer = new VectorLayer<any>({
        source: airportsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS,
        updateWhileAnimating: false,
        updateWhileInteracting: false,
        properties: {
            type: 'airports',
        },
        declutter: 'airports',
    });

    const styles = airportLayoutStyles();

    navigraphLayer = new VectorLayer<any>({
        source: navigraphSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_NAVIGRAPH,
        declutter: true,
        updateWhileAnimating: false,
        updateWhileInteracting: false,
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
        updateWhileAnimating: false,
        updateWhileInteracting: false,
        properties: {
            type: 'airports-gates',
        },
    });

    map.value.addLayer(airportsLayer);
    map.value.addLayer(navigraphLayer);
    map.value.addLayer(gatesLayer);

    useUpdateCallback(['short', 'extent', dataStore.airportsList, updateRelatedSettings], async newValue => {
        const result = await getInitialAirportsList({ navigraphData, source: airportsSource, map: map.value! });
        if (!result) return;
        airportsList.value = result.all;
        visibleAirports.value = result.visible;
    }, {
        immediate: true,
    });

    const mapSettings = computed(() => store.mapSettings);
    const mapRender = computed(() => !mapStore.renderedAirports?.length);

    watch([airportsList, mapSettings, mapRender], async () => {
        if (isHideMapObject('airports')) {
            airportsSource?.clear();
            globalMapEntities.airports = null;
            navigraphSource?.clear();
            gatesSource?.clear();
            return;
        }

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
    navigraphLayer?.dispose();
    gatesLayer?.dispose();

    airportsSource?.clear();
    globalMapEntities.airports = null;
    navigraphSource?.clear();
    gatesSource?.clear();

    map.value?.removeLayer(airportsLayer);
    map.value?.removeLayer(navigraphLayer);
    map.value?.removeLayer(gatesLayer);
});
</script>
