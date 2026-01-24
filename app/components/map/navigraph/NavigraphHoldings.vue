<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import type { Coordinate } from 'ol/coordinate.js';
import { useMapStore } from '~/store/map';
import type { NavDataFlightLevel } from '~/utils/server/navigraph/navdata/types';
import { debounce } from '~/utils/shared';
// @ts-expect-error JS-only lib
import { magvar } from 'magvar';

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.holdings);
let features: Feature[] = [];

// Dark magic from ChatGPT
// Compute a destination point given start (lat,lon), distance (m), and bearing (° from north)
function computeOffset(from: Coordinate, dist: number, bearingDeg: number) {
    const R = 6378137; // Earth radius in m (WGS‑84)
    const deltaSigma = dist / R;
    const bearingRadians = bearingDeg * Math.PI / 180;
    const startLatRadians = from[1] * Math.PI / 180;
    const startLonRadians = from[0] * Math.PI / 180;

    const newLatRadians = Math.asin(
        (Math.sin(startLatRadians) * Math.cos(deltaSigma)) +
            (Math.cos(startLatRadians) * Math.sin(deltaSigma) * Math.cos(bearingRadians)),
    );
    const newLonRadians = startLonRadians + Math.atan2(
        Math.sin(bearingRadians) * Math.sin(deltaSigma) * Math.cos(startLatRadians),
        Math.cos(deltaSigma) - (Math.sin(startLatRadians) * Math.sin(newLatRadians)),
    );

    return [
        newLonRadians * 180 / Math.PI,
        newLatRadians * 180 / Math.PI,
    ];
}

// Compute bearing (° from north) from point A to B
function computeBearing(A: Coordinate, B: Coordinate) {
    const a1 = A[1] * Math.PI / 180;
    const a2 = B[1] * Math.PI / 180;
    const calc = (B[0] - A[0]) * Math.PI / 180;

    const y = Math.sin(calc) * Math.cos(a2);
    const x = (Math.cos(a1) * Math.sin(a2)) -
        (Math.sin(a1) * Math.cos(a2) * Math.cos(calc));
    const c = Math.atan2(y, x);
    return (((c * 180) / Math.PI) + 360) % 360;
}

function generateHoldingPatternGeoJSON(
    startLatLng: Coordinate,
    groundSpeedKts: number,
    startBearingDeg: number,
    turnDirection = 'R' as 'L' | 'R',
    distanceInput: number,
    distanceInMinutes = true,
    steps = 64,
) {
    const decl = magvar(startLatLng[1], startLatLng[0]);
    startBearingDeg = (startBearingDeg + decl + 360) % 360;

    // 1) Turn radius for standard‐rate turn (3°/s)
    const gsMs = groundSpeedKts * 0.514444;
    const turnRateRad = 3 * Math.PI / 180;
    const Rm = gsMs / turnRateRad; // radius in meters

    // 2) Compute outbound leg distance in meters
    const distanceMeters = distanceInMinutes
        ? gsMs * 60 * distanceInput
        : 1852 * distanceInput;

    // 3) Sign for turn direction
    const sign = turnDirection === 'R' ? 1 : -1;

    // 4) Center‑1 of first semicircle: offset from fix by Rm at (startBearing ± 90°)
    const center1 = computeOffset(
        startLatLng,
        Rm,
        (startBearingDeg + (turnDirection === 'R' ? 90 : -90) + 360) % 360,
    );

    // 5) Sample the first 180° arc around center1
    const bearingStart1 = computeBearing(center1, startLatLng);
    const arc1 = [];
    for (let i = 0; i <= steps; i++) {
        const bearing = bearingStart1 + (sign * (Math.PI * (i / steps)) * 180 / Math.PI);
        const pt = computeOffset(center1, Rm, bearing % 360);
        arc1.push(pt);
    }

    // 6) Outbound leg start/end
    const outboundBearing = (startBearingDeg + 180) % 360;
    const legStart = [arc1[arc1.length - 1][0], arc1[arc1.length - 1][1]];
    const legEnd = computeOffset(legStart, distanceMeters, outboundBearing);
    const legPts = [legStart, legEnd];

    // 7) Center‑2 of second semicircle (at end of leg)
    const center2 = computeOffset(
        legEnd,
        Rm,
        (outboundBearing + (turnDirection === 'R' ? 90 : -90) + 360) % 360,
    );

    // 8) Sample the second 180° arc around center2
    const bearingStart2 = computeBearing(center2, legEnd);
    const arc2 = [];
    for (let i = 0; i <= steps; i++) {
        const bearing = bearingStart2 + (sign * (Math.PI * (i / steps)) * 180 / Math.PI);
        const pt = computeOffset(center2, Rm, bearing % 360);
        arc2.push(pt);
    }

    // 9) Return inbound (straight back to fix)
    const returnLeg = [
        [arc2[arc2.length - 1][0], arc2[arc2.length - 1][1]],
        startLatLng,
    ];

    // 10) Build the full GeoJSON FeatureCollection
    return [
        ...arc1,
        legPts[1],
        ...arc2,
        returnLeg[1],
    ];
}

const extent = computed(() => mapStore.extent);
const level = computed(() => store.mapSettings.navigraphData?.mode);

const starWaypoints = shallowRef<string[]>([]);
const aircraftWaypoints = shallowRef<string[]>([]);

const debouncedUpdate = debounce(() => {
    aircraftWaypoints.value = Array.from(new Set(Object.values(dataStore.navigraphWaypoints.value).map(x => x.disableHoldings ? [] : x.waypoints.filter(x => x.kind !== 'sids' && x.canShowHold).flatMap(x => x.identifier).filter(x => !!x)).flatMap(x => x)));
    starWaypoints.value = Array.from(new Set(Object.values(dataStore.navigraphProcedures).flatMap(x => Object.values(x!.stars)).flatMap(x => [
        x.procedure.waypoints.map(x => x.identifier),
        x.procedure.transitions.enroute.flatMap(x => x.waypoints.map(x => x.identifier)),
        x.procedure.transitions.runway.flatMap(x => x.waypoints.map(x => x.identifier)),
    ]).flat()));
}, 1000);

watch([dataStore.navigraphWaypoints, dataStore.navigraphProcedures], debouncedUpdate, {
    immediate: true,
});

watch([isEnabled, extent, level, starWaypoints, aircraftWaypoints], async ([enabled, extent]) => {
    const newFeatures: Feature[] = [];

    if (!enabled && !starWaypoints.value.length && !aircraftWaypoints.value.length) {
        source?.value.removeFeatures(features);
        features = [];
        return;
    }

    const entries = Object.entries(await dataStore.navigraph.data('holdings') ?? {}).filter(x => (enabled && x[1][8] === 'ENRT') || starWaypoints.value.includes(x[1][0]) || aircraftWaypoints.value.includes(x[1][0]));

    entries.forEach(([key, [waypoint, course, time, length, turns, longitude, latitude, speed,, minLat, maxLat]], index) => {
        let flightLevel: NavDataFlightLevel = 'B';

        if (maxLat && maxLat < 18000) flightLevel = 'L';
        if (minLat && minLat >= 18000) flightLevel = 'H';

        if (!isPointInExtent([longitude, latitude], extent) || !checkFlightLevel(flightLevel)) return;

        const existingFeatures = features.filter(x => x.getProperties().key === key);
        if (existingFeatures.length) {
            newFeatures.push(...existingFeatures);
            return;
        }

        speed ??= 240;
        time ??= 0;

        newFeatures.push(
            new Feature({
                geometry: new LineString(generateHoldingPatternGeoJSON([longitude, latitude], speed, course, turns, time || length || 0, !!time, 32)),
                key,
                turns,
                time,
                course,
                dataType: 'navdata',
                type: 'holdings',
            }),
            new Feature({
                geometry: new Point([longitude, latitude]),
                key,
                waypoint,
                flightLevel,
                dataType: 'navdata',
                type: 'holding-waypoint',
            }),
        );
    });

    source?.value.removeFeatures(features);
    features = newFeatures;
    source?.value.addFeatures(features);
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
