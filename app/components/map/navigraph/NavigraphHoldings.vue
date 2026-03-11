<script setup lang="ts">
import { useStore } from '~/store';
import { LineString } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import type { Coordinate } from 'ol/coordinate.js';
import { useMapStore } from '~/store/map';
import type { NavDataFlightLevel, NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';
import { debounce } from '~/utils/shared';
// @ts-expect-error JS-only lib
import { magvar } from 'magvar';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureNavigraph } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.holdings);
let features: FeatureNavigraph[] = [];

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

const starWaypoints = shallowRef<Set<string>>(new Set());
const aircraftWaypoints = shallowRef<Set<string>>(new Set());

const debouncedUpdate = debounce(() => {
    aircraftWaypoints.value.clear();
    starWaypoints.value.clear();

    for (const item of Object.values(dataStore.navigraphWaypoints.value)) {
        if (item.disableHoldings) continue;

        for (const waypoint of item.waypoints) {
            if (waypoint.kind === 'sids' || !waypoint.canShowHold) continue;
            aircraftWaypoints.value.add(waypoint.identifier);
        }
    }

    for (const item of Object.values(dataStore.navigraphProcedures)) {
        for (const star of Object.values(item!.stars)) {
            star.procedure.waypoints.forEach(x => starWaypoints.value.add(x.identifier));
            star.procedure.transitions.enroute.forEach(x => x.waypoints.forEach(x => starWaypoints.value.add(x.identifier)));
            star.procedure.transitions.runway.forEach(x => x.waypoints.forEach(x => starWaypoints.value.add(x.identifier)));
        }
    }
}, 1000);

watch([dataStore.navigraphWaypoints, dataStore.navigraphProcedures], debouncedUpdate, {
    immediate: true,
});

let holdings: [string, NavigraphNavDataShort['holdings'][string]][] | null = null;

watch([isEnabled, extent, level, starWaypoints, aircraftWaypoints], async ([enabled, extent]) => {
    if (!enabled && !starWaypoints.value.size && !aircraftWaypoints.value.size) {
        source?.value.removeFeatures(features);
        features = [];
        holdings = null;
        return;
    }

    if (!holdings) {
        // TODO: refactor to keyval usage if not enabled
        holdings = Object.entries(await dataStore.navigraph.data('holdings') ?? {});
    }

    for (let [key, [waypoint, course, time, length, turns, longitude, latitude, speed, type, minLat, maxLat]] of holdings) {
        if ((!enabled && type !== 'ENRT') || !starWaypoints.value.has(waypoint) || !aircraftWaypoints.value.has(waypoint)) continue;

        let flightLevel: NavDataFlightLevel = 'B';

        if (maxLat && maxLat < 18000) flightLevel = 'L';
        if (minLat && minLat >= 18000) flightLevel = 'H';

        const id = `holding-${ key }`;

        const existingFeature = getMapFeature('navigraph', source!.value, id);

        if (!checkFlightLevel(flightLevel) || !isPointInExtent([longitude, latitude], extent)) {
            if (existingFeature) {
                source?.value?.removeFeature(existingFeature);
                existingFeature.dispose();
            }
            return;
        }

        if (existingFeature) continue;

        speed ??= 240;
        time ??= 0;

        source?.value.addFeature(createMapFeature('navigraph', {
            geometry: new LineString(generateHoldingPatternGeoJSON([longitude, latitude], speed, course, turns, time || length || 0, !!time, 32)),
            key,
            turns,
            time,
            course,
            featureType: 'holdings',
            type: 'navigraph',
            id,
            pointCoordinate: [longitude, latitude],
        }));
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
