<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { toRadians } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';


defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.holdings !== false);
let features: Feature[] = [];

/**
 * @note ChatGPT generated. Feel free to rewrite. I'm trash at this
 */
function getArcPoints(A: Coordinate, B: Coordinate, polyCenter: Coordinate) {
    const [ax, ay] = A;
    const [bx, by] = B;

    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.hypot(dx, dy);
    const r0 = d / 2;

    const start0 = Math.atan2(ay - cy, ax - cx);
    const deltas = [Math.PI, -Math.PI];
    const best = deltas.reduce((best, cand) => {
        const mid = start0 + (cand / 2);
        const mx = cx + (r0 * Math.cos(mid));
        const my = cy + (r0 * Math.sin(mid));
        const dist2 = ((mx - polyCenter[0]) ** 2) + ((my - polyCenter[1]) ** 2);
        return dist2 > best.dist2
            ? { delta: cand, dist2 }
            : best;
    }, { delta: Math.PI, dist2: -Infinity });
    const sign = Math.sign(best.delta);

    const delta = best.delta * 0.5;

    const R = r0 / Math.sin(Math.abs(delta) / 2);

    const h = Math.sqrt((R * R) - (r0 * r0));

    const ux = -dy / d;
    const uy = dx / d;

    const centerX = cx + (ux * sign * h);
    const centerY = cy + (uy * sign * h);

    const start = Math.atan2(ay - centerY, ax - centerX);

    const pts = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
        const ang = start + (delta * (i / segments));
        pts.push([
            centerX + (R * Math.cos(ang)),
            centerY + (R * Math.sin(ang)),
        ]);
    }
    return pts;
}


watch(isEnabled, async val => {
    if (!val) {
        source?.value.removeFeatures(features);
        features = [];
    }
    else {
        const entries = Object.entries(dataStore.navigraph.data.value!.holdings).filter(x => x[1][6] === 'ENRT');

        entries.forEach(([key, [course, time, turns, longitude, latitude, speed]], index) => {
            time ??= 1;
            speed ??= 240;

            const speedDistance = speed * (time / 60);
            const degLat = speedDistance / 60;

            const degLon = speedDistance / 60 / Math.cos(toRadians(latitude));

            const latSign = (turns === 'L') ? 1 : -1;

            const L = degLon;
            const W = degLat;

            const modifier = toRadians(course);
            const sin = Math.sin(modifier);
            const cos = Math.cos(modifier);

            const lx = -Math.cos(modifier) * latSign;
            const ly = Math.sin(modifier) * latSign;

            const corners: [number, number][] = [
                [0, 0],
                [-L, 0],
                [-L, W],
                [0, W],
                [0, 0],
            ];

            const extent = corners.map(([da, dl]) => [
                longitude + (da * sin) + (dl * lx),
                latitude + (da * cos) + (dl * ly),
            ]);

            const points: Coordinate[] = [];

            const polyCenter = [
                (extent[0][0] + extent[2][0]) / 2,
                (extent[0][1] + extent[2][1]) / 2,
            ];

            points.push(extent[0]);
            points.push(extent[1]);
            points.push(...getArcPoints(extent[1], extent[2], polyCenter));
            points.push(extent[3]);
            points.push(...getArcPoints(extent[3], extent[4], polyCenter));

            features.push(
                new Feature({
                    geometry: new LineString(points),
                    key,
                    turns,
                    time,
                    course,
                    type: 'holdings',
                }),
            );
        });

        source?.value.addFeatures(features);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
