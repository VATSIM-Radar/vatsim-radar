<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import { checkFlightLevel } from '~/composables/render/storage';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureNavigraph } from '~/utils/map/entities';
import type { NavigraphNavDataShort, ShortAirspace } from '~/utils/server/navigraph/navdata/types';
import {
    restrictiveAirspaceFeatureToGeoJSON,
} from '~/utils/shared/airspace';
import { turfGeometryToOl } from '~/utils';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

const restrictiveEnabled = useSettingValueFromFunc('map.navigraph.layers.airspace.restricted');
const controlledEnabled = useSettingValueFromFunc('map.navigraph.layers.airspace.controlled');

const extent = computed(() => mapStore.extent);
const level = computed(() => getKeyedValueFromSettings('map.navigraph.layers.ifrMode'));

type AirspaceDataKey = 'restrictedAirspace' | 'controlledAirspace';
type AirspaceFeatureType = 'restrictive-airspace' | 'controlled-airspace';

let inProgress = false;
const airspaces: Partial<Record<AirspaceDataKey, NavigraphNavDataShort[AirspaceDataKey]>> = {};
const featuresCache = new Map<string, FeatureNavigraph>();

function isAirspaceInExtent(item: ShortAirspace, extent: number[]) {
    return item[6].some(point => {
        if (point[0] != null && point[1] != null && isPointInExtent([point[0], point[1]], extent)) return true;
        if (point[3] != null && point[4] != null && isPointInExtent([point[3], point[4]], extent)) return true;

        return false;
    });
}

function getFeature(dataKey: AirspaceDataKey, featureType: AirspaceFeatureType, key: string, item: ShortAirspace) {
    const id = `${ featureType }-${ key }`;
    const cached = featuresCache.get(id);
    if (cached) return cached;

    const geojson = restrictiveAirspaceFeatureToGeoJSON({
        airspace: {
            areaCode: null,
            designation: item[1],
            flightLevel: item[5],
            icaoCode: null,
            lowerLimit: item[3],
            lowerLimitUnit: null,
            multipleCode: null,
            name: item[2],
            type: item[0],
            upperLimit: item[4],
            upperLimitUnit: null,
        },
        points: item[6].map(point => ({
            arcBearing: point[5],
            arcDistance: point[6],
            arcOrigin: point[3] == null || point[4] == null ? null : [point[3], point[4]],
            boundaryVia: point[2],
            coordinate: point[0] == null || point[1] == null ? null : [point[0], point[1]],
            seqno: point[7],
        })),
    });
    if (!geojson) return null;

    const feature = createMapFeature('navigraph', {
        geometry: turfGeometryToOl(geojson),
        key,
        name: item[2] ?? item[1] ?? key,
        identifier: featureType === 'restrictive-airspace' ? ((item[0] || '') + (item[1] || '')) : item[0] ?? '',
        lowerLimit: item[3],
        upperLimit: item[4],
        flightLevel: item[5],
        type: 'navigraph',
        dbType: dataKey,
        featureType,
        id,
    });

    featuresCache.set(id, feature);

    return feature;
}

async function renderAirspaces(dataKey: AirspaceDataKey, featureType: AirspaceFeatureType, extent: number[], displayed: Set<string>) {
    airspaces[dataKey] ??= await dataStore.navigraph.data(dataKey) ?? {};

    let counter = 0;

    for (const [key, item] of Object.entries(airspaces[dataKey] ?? {})) {
        const id = `${ featureType }-${ key }`;
        const existingFeature = getMapFeature('navigraph', source!.value, id);
        counter++;
        if (counter % 1000 === 0) await sleep(0);

        if (!checkFlightLevel(item[5]) || !isAirspaceInExtent(item, extent)) {
            if (existingFeature) {
                source?.value.removeFeature(existingFeature);
            }
            continue;
        }

        displayed.add(id);

        if (existingFeature) continue;

        const feature = getFeature(dataKey, featureType, key, item);
        if (feature) source?.value.addFeature(feature);
    }
}

function cleanup() {
    const features = source?.value.getFeatures() ?? [];

    for (const feature of features) {
        const type = feature.getProperties().featureType;
        if (type === 'restrictive-airspace' || type === 'controlled-airspace') {
            source?.value.removeFeature(feature);
            feature.dispose();
        }
    }

    featuresCache.clear();
    delete airspaces.restrictedAirspace;
    delete airspaces.controlledAirspace;
}

watch([restrictiveEnabled, controlledEnabled, extent, level], async ([restrictedEnabled, controlledEnabled, extent], [oldRestrictedEnabled, oldControlledEnabled]) => {
    if (inProgress) return;

    if (restrictedEnabled !== oldRestrictedEnabled || controlledEnabled !== oldControlledEnabled) {
        cleanup();

        if (!restrictedEnabled && !controlledEnabled) return;
    }

    try {
        inProgress = true;

        const displayed = new Set<string>();

        if (restrictedEnabled) await renderAirspaces('restrictedAirspace', 'restrictive-airspace', extent, displayed);
        if (controlledEnabled) await renderAirspaces('controlledAirspace', 'controlled-airspace', extent, displayed);

        const features = source?.value.getFeatures() ?? [];

        for (const feature of features) {
            const properties = feature.getProperties();
            if ((properties.featureType !== 'restrictive-airspace' && properties.featureType !== 'controlled-airspace') || displayed.has(properties.id)) continue;

            source?.value.removeFeature(feature);
        }
    }
    finally {
        inProgress = false;
    }
}, {
    immediate: true,
});

onBeforeUnmount(cleanup);
</script>
