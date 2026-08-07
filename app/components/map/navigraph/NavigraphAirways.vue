<script setup lang="ts">
import { LineString, Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { intersects } from 'ol/extent.js';
import { useMapStore } from '~/store/map';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type { Coordinate } from 'ol/coordinate.js';
import { checkFlightLevel } from '~/composables/render/storage';
import type { NavDataFlightLevel } from '~/utils/server/navigraph/navdata/types';
import { createMapFeature } from '~/utils/map/entities';
import type { FeatureNavigraph } from '~/utils/map/entities';
import { createSpatialGridIndex } from '~/utils/map/spatial-index';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

const isEnabled = computed(() => getKeyedValueFromSettings('map.navigraph.layers.airways.enabled') !== false);
type AirwayGeometry = ObjectWithGeometry<any, {
    waypointCoordinate: Coordinate;
    airwayCoords: [Coordinate, Coordinate] | null;
    airwayKey: string;
    identifier: string;
    waypoint: string;
    inbound: number;
    outbound: number;
    flightLevel: NavDataFlightLevel;
    usage: string | undefined;
}>;

const geometries: AirwayGeometry[] = [];
let geometryIndex: ReturnType<typeof createSpatialGridIndex<AirwayGeometry>> | null = null;
let geometriesVersion: string | null = null;
const airwayFeatures = new Map<string, FeatureNavigraph>();
const airwayWaypointFeatures = new Map<string, FeatureNavigraph>();

const extent = computed(() => mapStore.extent);
const level = computed(() => getKeyedValueFromSettings('map.navigraph.layers.ifrMode'));

let inProgress = false;
let pendingUpdate = false;
let disposed = false;

function removeFeature(features: Map<string, FeatureNavigraph>, id: string) {
    const feature = features.get(id);
    if (!feature) return;

    source?.value.removeFeature(feature);
    feature.dispose();
    features.delete(id);
}

function cleanup() {
    geometries.length = 0;
    geometryIndex = null;
    for (const id of airwayFeatures.keys()) removeFeature(airwayFeatures, id);
    for (const id of airwayWaypointFeatures.keys()) removeFeature(airwayWaypointFeatures, id);
}

async function updateAirways() {
    if (disposed) return;

    if (inProgress) {
        pendingUpdate = true;
        return;
    }

    if (!isEnabled.value) {
        cleanup();
        return;
    }

    try {
        inProgress = true;
        pendingUpdate = false;

        const version = dataStore.navigraph.version.value;
        if (geometriesVersion !== version) {
            cleanup();
            geometriesVersion = version;
        }

        if (!geometryIndex) {
            geometryIndex = createSpatialGridIndex<AirwayGeometry>({
                getExtent: ({ waypointCoordinate, airwayCoords }) => {
                    if (!airwayCoords) return [waypointCoordinate[0], waypointCoordinate[1], waypointCoordinate[0], waypointCoordinate[1]];
                    return [
                        Math.min(airwayCoords[0][0], airwayCoords[1][0]),
                        Math.min(airwayCoords[0][1], airwayCoords[1][1]),
                        Math.max(airwayCoords[0][0], airwayCoords[1][0]),
                        Math.max(airwayCoords[0][1], airwayCoords[1][1]),
                    ];
                },
            });
            const entries = Object.entries(await dataStore.navigraph.data('airways') ?? {});
            if (disposed) return;

            const len = entries.length;

            for (let i = 0; i < len; i += 100) {
                for (let k = i; k < i + 100; k++) {
                    const entry = entries[k];
                    if (!entry) continue;
                    const [key, [identifier, type, waypoints]] = entry;

                    if (type === 'C') continue;

                    waypoints.forEach((waypoint, index) => {
                        const nextWaypoint = waypoints[index + 1];

                        const geometry: AirwayGeometry = {
                            waypointCoordinate: [waypoint[3], waypoint[4]],
                            airwayCoords: nextWaypoint ? [[waypoint[3], waypoint[4]], [nextWaypoint[3], nextWaypoint[4]]] : null,
                            airwayKey: key,
                            identifier,
                            waypoint: waypoint[0],
                            inbound: waypoint[1],
                            outbound: waypoint[2],
                            flightLevel: waypoint[5],
                            usage: waypoint[6],
                        };
                        geometries.push(geometry);
                        geometryIndex!.add(geometry);
                    });
                }

                await sleep(0);
                if (disposed) return;
            }
        }

        const currentExtent = extent.value;
        const visibleAirways = new Set<string>();
        const visibleWaypoints = new Set<string>();
        const featuresToAdd: FeatureNavigraph[] = [];

        for (const entry of geometryIndex.query(currentExtent)) {
            const id = 'waypoint' + entry.airwayKey + entry.identifier + entry.waypoint;
            const waypointId = id + 'text';
            const inExtent = entry.airwayCoords
                ? intersects([
                    Math.min(entry.airwayCoords[0][0], entry.airwayCoords[1][0]),
                    Math.min(entry.airwayCoords[0][1], entry.airwayCoords[1][1]),
                    Math.max(entry.airwayCoords[0][0], entry.airwayCoords[1][0]),
                    Math.max(entry.airwayCoords[0][1], entry.airwayCoords[1][1]),
                ], currentExtent)
                : isPointInExtent(entry.waypointCoordinate, currentExtent);

            if (checkFlightLevel(entry.flightLevel) && inExtent) {
                if (entry.airwayCoords) {
                    visibleAirways.add(id);
                    if (!airwayFeatures.has(id)) {
                        const feature = createMapFeature('navigraph', {
                            type: 'navigraph',
                            featureType: 'airways',
                            geometry: new LineString(entry.airwayCoords),
                            usage: entry.usage,
                            flightLevel: entry.flightLevel,
                            id,
                            key: entry.airwayKey,
                            identifier: entry.identifier,
                            waypoint: entry.waypoint,
                            outbound: entry.outbound,
                            inbound: entry.inbound,
                            pointCoordinate: entry.waypointCoordinate,
                            name: entry.airwayKey,
                            dbType: 'airways',
                        });
                        airwayFeatures.set(id, feature);
                        featuresToAdd.push(feature);
                    }
                }

                if (entry.waypointCoordinate) {
                    visibleWaypoints.add(waypointId);
                    if (!airwayWaypointFeatures.has(waypointId)) {
                        const feature = createMapFeature('navigraph', {
                            type: 'navigraph',
                            featureType: 'airways-waypoint',
                            geometry: new Point(entry.waypointCoordinate),
                            usage: entry.usage,
                            flightLevel: entry.flightLevel,
                            id: waypointId,
                            identifier: entry.identifier,
                            key: entry.airwayKey,
                            waypoint: entry.waypoint,
                            outbound: entry.outbound,
                            inbound: entry.inbound,
                            pointCoordinate: entry.waypointCoordinate,
                            name: entry.airwayKey,
                            dbType: null,
                        });
                        airwayWaypointFeatures.set(waypointId, feature);
                        featuresToAdd.push(feature);
                    }
                }
            }
        }

        for (const id of airwayFeatures.keys()) {
            if (!visibleAirways.has(id)) removeFeature(airwayFeatures, id);
        }
        for (const id of airwayWaypointFeatures.keys()) {
            if (!visibleWaypoints.has(id)) removeFeature(airwayWaypointFeatures, id);
        }
        if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);
    }
    finally {
        inProgress = false;
        if (pendingUpdate && !disposed) updateAirwaysThrottled();
    }
}

const updateAirwaysThrottled = useThrottleFn(updateAirways, 1000, true);

watch([isEnabled, extent, level, dataStore.navigraph.version], () => updateAirwaysThrottled(), {
    immediate: true,
});

onBeforeUnmount(() => {
    disposed = true;
    cleanup();
});
</script>
