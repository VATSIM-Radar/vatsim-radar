<script setup lang="ts">
import { injectMap } from '~/composables/map';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { MapAirportRender } from '~/types/map';
import { getRenderAirportsList, getInitialAirportsList } from '~/composables/render/airports';
import type { AirportListItem } from '~/composables/render/airports';
import { logBench, useUpdateCallback } from '~/composables';
import { setMapAirports } from '~/composables/render/airports/layers/airport';
import { globalMapEntities } from '~/utils/map/entities';
import { setMapGatesRunways } from '~/composables/render/airports/layers/gates';
import type { AmdbLayerName } from '@navigraph/amdb';
import { airportLayoutStyles } from '~/composables/navigraph/layouts';
import { setMapNavigraphLayout } from '~/composables/render/airports/layers/layout';
import { isHideMapObject } from '~/composables/settings';
import VectorImageLayer from 'ol/layer/VectorImage.js';

defineOptions({
    render: () => null,
});

export type AirportNavigraphData = Record<string, NavigraphAirportData>;

const mapStore = useMapStore();
const map = injectMap();
const navigraphData = shallowRef<Record<string, NavigraphAirportData>>({});

let airportsLayer: VectorLayer<any>;
let airportsSource: VectorSource;

let navigraphLayer: VectorImageLayer<any>;
let navigraphSource: VectorSource;

let gatesLayer: VectorImageLayer<any>;
let gatesSource: VectorSource;

const now = new Date();
const end = ref(new Date());
const mapSettings = computed(() => getKeyedValueFromSettings('map.bookings.hours'));

const dataStore = useDataStore();
const airportsList = shallowRef<MapAirportRender[]>([]);
const visibleAirports = shallowRef<DataAirport[]>([]);
const airports = shallowRef<AirportListItem[]>([]);

watch(mapSettings, val => {
    const currentDate = new Date();
    currentDate.setTime(now.getTime() + (((val * 60) * 60) * 1000));
    end.value = currentDate;
}, {
    immediate: true,
});

const getShownAirports = computed(() => {
    const airportsListSet = new Set(airportsList.value.map(x => x.airport.icao));

    let list = airports.value.filter(x => airportsListSet.has(x.icao));

    const knownIcaos = new Set<string>();

    for (const overlay of mapStore.overlays) {
        if (overlay.type === 'airport') {
            knownIcaos.add(overlay.key);
            continue;
        }

        if (overlay.type !== 'pilot') continue;

        knownIcaos.add(overlay.data.pilot.flight_plan?.departure ?? '');
        knownIcaos.add(overlay.data.pilot.flight_plan?.arrival ?? '');
    }

    if (mapStore.hoveredPilot) {
        const pilot = dataStore.vatsim.data.keyedPilots.value[mapStore.hoveredPilot];
        if (pilot) {
            knownIcaos.add(pilot.departure ?? '');
            knownIcaos.add(pilot.arrival ?? '');
        }
    }

    switch (getKeyedValueFromSettings('map.preferences.airports.showMode')) {
        case 'staffedOnly':
            list = list.filter(x => {
                return knownIcaos.has(x.icao) || x.atc.length;
            });
            break;
        case 'staffedAndGroundTraffic':
            list = list.filter(x => {
                return knownIcaos.has(x.icao) || x.atc.length || x.aircraft.groundArr?.length || x.aircraft.groundDep?.length;
            });
            break;
    }

    return list;
});

const updateRelatedSettings = computed(() => String(getKeyedValueFromSettings('map.navigraph.airport.enabled')) + String(getKeyedValueFromSettings('map.preferences.airports.showMode')));

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
    const touch = useIsTouch();
    const zoomHiddenLayoutTypes = new Set<AmdbLayerName>(['taxiwayintersectionmarking', 'taxiwayguidanceline', 'deicingarea', 'finalapproachandtakeoffarea']);

    navigraphLayer = new VectorImageLayer<any>({
        source: navigraphSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_NAVIGRAPH,
        declutter: 'airports-navigraph',
        properties: {
            type: 'airports-navigraph',
        },
        imageRatio: touch.value ? 1 : 1.5,
        minZoom: 12,
        style: function(feature) {
            const type = feature.get('type') as AmdbLayerName;
            if (zoomHiddenLayoutTypes.has(type) && mapStore.preciseZoom < 14.5) return;

            const style = styles[type];

            if (typeof style === 'function') return style(feature as any);

            return style;
        },
    });

    gatesLayer = new VectorImageLayer<any>({
        source: gatesSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_GATES,
        minZoom: 15,
        declutter: 'gates',
        imageRatio: touch.value ? 1 : 1.5,
        properties: {
            type: 'airports-gates',
        },
    });

    map.value.addLayer(airportsLayer);
    map.value.addLayer(navigraphLayer);
    map.value.addLayer(gatesLayer);

    const updateAirports = useThrottleFn(async () => {
        const log = logBench('airportsPrepare');
        const result = await getInitialAirportsList({ navigraphData, source: airportsSource, map: map.value! });
        log();
        if (!result) return;
        airportsList.value = result.all;
        visibleAirports.value = result.visible;
    }, 500, true);

    useUpdateCallback(['short', 'extent', dataStore.airportsList, updateRelatedSettings], () => {
        updateAirports();
    }, {
        immediate: true,
    });

    const mapSettings = computed(() => JSON.stringify([
        getKeyedValueFromSettings('map.bookings.hours'),
        getKeyedValueFromSettings('map.preferences.airports.showMode'),
        getKeyedValueFromSettings('map.navigraph.airport.enabled'),
        getKeyedValueFromSettings('map.visibility.airports'),
        getKeyedValueFromSettings('map.visibility.gates'),
        getKeyedValueFromSettings('map.visibility.atc.approach'),
        getKeyedValueFromSettings('map.visibility.atc.ground'),
        getKeyedValueFromSettings('map.visibility.atcLabels'),
        getKeyedValueFromSettings('map.preferences.airports.shortView'),
    ]));
    const mapRender = computed(() => !mapStore.renderedAirports?.length);

    const renderAirports = useThrottleFn(async () => {
        if (isHideMapObject('airports')) {
            airportsSource?.clear();
            navigraphSource?.clear();
            gatesSource?.clear();
            return;
        }

        const log = logBench('airportsRender');

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

        log();
    }, 500, true);

    useUpdateCallback([airportsList, mapSettings, mapRender, 'short', getShownAirports], () => {
        renderAirports();
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
