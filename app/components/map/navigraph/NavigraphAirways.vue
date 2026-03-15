<script setup lang="ts">
import { useStore } from '~/store';
import { LineString, Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type { Coordinate } from 'ol/coordinate.js';
import { checkFlightLevel } from '~/composables/render/storage';
import type { NavDataFlightLevel } from '~/utils/server/navigraph/navdata/types';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.airways?.enabled !== false);
const geometries: ObjectWithGeometry<any, {
    waypointCoordinate: Coordinate;
    airwayCoords: [Coordinate, Coordinate] | null;
    airwayKey: string;
    identifier: string;
    waypoint: string;
    inbound: number;
    outbound: number;
    flightLevel: NavDataFlightLevel;
    usage: string | undefined;
}>[] = [];

const extent = computed(() => mapStore.extent);
const level = computed(() => store.mapSettings.navigraphData?.mode);

let inProgress = false;

function cleanup() {
    geometries.length = 0;
    const features = source?.value.getFeatures() ?? [];

    for (const feature of features) {
        const type = feature.getProperties().featureType;
        if (type === 'airways' || type === 'airways-waypoint') {
            source?.value.removeFeature(feature);
            feature.dispose();
        }
    }
}

watch([isEnabled, extent, level], async ([enabled, extent]) => {
    if (inProgress) return;

    if (!enabled) {
        cleanup();
        return;
    }

    try {
        inProgress = true;

        if (!geometries.length) {
            const entries = Object.entries(await dataStore.navigraph.data('airways') ?? {});
            const len = entries.length;

            for (let i = 0; i < len; i += 100) {
                for (let k = i; k < i + 100; k++) {
                    const entry = entries[k];
                    if (!entry) continue;
                    const [key, [identifier, type, waypoints]] = entry;

                    if (type === 'C') continue;

                    waypoints.forEach((waypoint, index) => {
                        const nextWaypoint = waypoints[index + 1];

                        geometries.push({
                            waypointCoordinate: [waypoint[3], waypoint[4]],
                            airwayCoords: nextWaypoint ? [[waypoint[3], waypoint[4]], [nextWaypoint[3], nextWaypoint[4]]] : null,
                            airwayKey: key,
                            identifier,
                            waypoint: waypoint[0],
                            inbound: waypoint[1],
                            outbound: waypoint[2],
                            flightLevel: waypoint[5],
                            usage: waypoint[6],
                        });
                    });
                }

                await sleep(0);
            }
        }

        for (let i = 0; i < geometries.length; i += 10000) {
            for (let k = i; k < i + 10000; k++) {
                const entry = geometries[k];
                if (!entry) continue;

                const id = 'waypoint' + entry.airwayKey + entry.identifier + entry.waypoint;
                const waypointId = id + 'text';

                const existingFeature = getMapFeature('navigraph', source!.value, id);
                const existingWaypointFeature = getMapFeature('navigraph', source!.value, id);

                if (checkFlightLevel(entry.flightLevel) && (entry.airwayCoords ? entry.airwayCoords.some((x: Coordinate) => isPointInExtent(x, extent)) : isPointInExtent(entry.waypointCoordinate, extent))) {
                    if (entry.airwayCoords && !existingFeature) {
                        source?.value.addFeature(createMapFeature('navigraph', {
                            type: 'navigraph',
                            featureType: 'airways',
                            geometry: new LineString(entry.airwayCoords),
                            usage: entry.usage,
                            flightLevel: entry.flightLevel,
                            id,
                            identifier: entry.identifier,
                            waypoint: entry.waypoint,
                            outbound: entry.outbound,
                            inbound: entry.inbound,
                            pointCoordinate: entry.waypointCoordinate,
                            name: entry.airwayKey,
                        }));
                    }

                    if (entry.waypointCoordinate && !existingWaypointFeature) {
                        source?.value.addFeature(createMapFeature('navigraph', {
                            type: 'navigraph',
                            featureType: 'airways-waypoint',
                            geometry: new Point(entry.waypointCoordinate),
                            usage: entry.usage,
                            flightLevel: entry.flightLevel,
                            id: waypointId,
                            identifier: entry.identifier,
                            waypoint: entry.waypoint,
                            outbound: entry.outbound,
                            inbound: entry.inbound,
                            pointCoordinate: entry.waypointCoordinate,
                            name: entry.airwayKey,
                        }));
                    }
                }
                else if (existingFeature) {
                    source?.value.removeFeature(existingFeature);
                    existingFeature.dispose();

                    if (existingWaypointFeature) {
                        source?.value.removeFeature(existingWaypointFeature);
                    }
                    existingWaypointFeature?.dispose();
                }
            }

            await new Promise(resolve => requestAnimationFrame(resolve));
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
