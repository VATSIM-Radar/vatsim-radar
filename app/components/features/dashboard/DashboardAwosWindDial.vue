<template>
    <svg
        class="awos-dial"
        role="img"
        :viewBox="`0 0 ${ SIZE } ${ SIZE }`"
    >
        <title>{{ ariaLabel }}</title>

        <circle
            class="awos-dial_ring"
            :cx="CENTER"
            :cy="CENTER"
            :r="RING"
        />

        <line
            v-for="tick in ticks"
            :key="tick.bearing"
            class="awos-dial_tick"
            :class="{ 'awos-dial_tick--major': tick.major }"
            :x1="tick.from.x"
            :x2="tick.to.x"
            :y1="tick.from.y"
            :y2="tick.to.y"
        />

        <text
            v-for="label in cardinalLabels"
            :key="label.text"
            class="awos-dial_cardinal"
            dominant-baseline="central"
            text-anchor="middle"
            :x="label.x"
            :y="label.y"
        >
            {{ label.text }}
        </text>

        <path
            v-if="sectorPath"
            class="awos-dial_sector"
            :d="sectorPath"
        />

        <g
            v-for="strip in strips"
            :key="strip.key"
            :transform="`translate(${ strip.offset.x } ${ strip.offset.y }) rotate(${ strip.bearing } ${ CENTER } ${ CENTER })`"
        >
            <rect
                class="awos-dial_runway"
                :height="RUNWAY_LENGTH"
                rx="2"
                :width="RUNWAY_WIDTH"
                :x="CENTER - (RUNWAY_WIDTH / 2)"
                :y="CENTER - (RUNWAY_LENGTH / 2)"
            />
            <line
                class="awos-dial_runway_centerline"
                :x1="CENTER"
                :x2="CENTER"
                :y1="CENTER - (RUNWAY_LENGTH / 2) + 6"
                :y2="CENTER + (RUNWAY_LENGTH / 2) - 6"
            />
        </g>

        <text
            v-for="label in runwayLabels"
            :key="label.ident"
            class="awos-dial_runway_label"
            :class="`awos-dial_runway_label--${ label.status }`"
            dominant-baseline="central"
            text-anchor="middle"
            :x="label.x"
            :y="label.y"
        >
            {{ label.ident }}
        </text>

        <g
            v-if="windDirection !== null"
            class="awos-dial_wind"
            :transform="`rotate(${ windDirection } ${ CENTER } ${ CENTER })`"
        >
            <path :d="`M${ CENTER } ${ CENTER - RING + 22 } L${ CENTER - 9 } ${ CENTER - RING } L${ CENTER + 9 } ${ CENTER - RING } Z`"/>
            <line
                :x1="CENTER"
                :x2="CENTER"
                :y1="CENTER - RING + 22"
                :y2="CENTER - RING + 44"
            />
        </g>

        <rect
            class="awos-dial_readout"
            height="34"
            rx="6"
            width="62"
            :x="CENTER - 31"
            :y="CENTER - 17"
        />
        <text
            class="awos-dial_readout_direction"
            dominant-baseline="central"
            text-anchor="middle"
            :x="CENTER"
            :y="CENTER - 6"
        >
            {{ directionText }}
        </text>
        <text
            class="awos-dial_readout_speed"
            dominant-baseline="central"
            text-anchor="middle"
            :x="CENTER"
            :y="CENTER + 9"
        >
            {{ speedText }}
        </text>
    </svg>
</template>

<script setup lang="ts">
import type { IMetar } from 'metar-taf-parser';
import { formatHeading, isCalmWind, trueToMagnetic } from '~/utils/shared/awos';
import type { AwosDialRunway } from '~/composables/vatsim/awos';

const props = defineProps<{
    wind: IMetar['wind'] | null | undefined;
    /** Local magnetic variation (east positive). Null = draw everything in true */
    variation: number | null;
    runways: AwosDialRunway[];
}>();

const SIZE = 234;
const CENTER = SIZE / 2;
const RING = 100;
const RUNWAY_LENGTH = 124;
const RUNWAY_WIDTH = 14;
/** Lateral distance between parallel runways on the dial */
const PARALLEL_OFFSET = 22;

interface Point {
    x: number;
    y: number;
}

/** Point at a compass bearing (0 = up, clockwise) and distance from the dial centre */
function polar(bearing: number, radius: number): Point {
    const rad = bearing * Math.PI / 180;
    return { x: CENTER + (radius * Math.sin(rad)), y: CENTER - (radius * Math.cos(rad)) };
}

const toDisplay = (bearing: number) => (props.variation === null ? bearing : trueToMagnetic(bearing, props.variation));

const ticks = computed(() => Array.from({ length: 36 }, (_, index) => {
    const bearing = index * 10;
    const major = bearing % 30 === 0;
    return { bearing, major, from: polar(bearing, RING), to: polar(bearing, RING - (major ? 9 : 5)) };
}));

const cardinalLabels = [
    { text: '36', ...polar(0, RING + 10) },
    { text: '09', ...polar(90, RING + 10) },
    { text: '18', ...polar(180, RING + 10) },
    { text: '27', ...polar(270, RING + 10) },
];

const isCalm = computed(() => isCalmWind(props.wind ?? undefined));

/** Display (magnetic when possible) wind direction; null for calm or VRB */
const windDirection = computed(() => {
    if (!props.wind || isCalm.value || typeof props.wind.degrees !== 'number') return null;
    return toDisplay(props.wind.degrees);
});

/** Variable sector arc along the ring, drawn clockwise from min to max (handles sectors crossing north) */
const sectorPath = computed(() => {
    const wind = props.wind;
    if (typeof wind?.minVariation !== 'number' || typeof wind.maxVariation !== 'number') return null;

    const min = toDisplay(wind.minVariation);
    const max = toDisplay(wind.maxVariation);
    const span = ((max - min) + 360) % 360;
    const start = polar(min, RING);
    const end = polar(max, RING);

    return `M${ start.x } ${ start.y } A${ RING } ${ RING } 0 ${ span > 180 ? 1 : 0 } 1 ${ end.x } ${ end.y }`;
});

/**
 * Lateral offset of a runway end on the dial: L is drawn left of the direction of travel, R right, C/single on the axis.
 * Rotated into dial coordinates so both ends of the same physical runway (e.g. 06L and 24R) land on the same strip.
 */
function getRunwayOffset(ident: string, bearing: number): Point {
    const side = ident.endsWith('L') ? -1 : ident.endsWith('R') ? 1 : 0;
    const rad = bearing * Math.PI / 180;
    return { x: side * PARALLEL_OFFSET * Math.cos(rad), y: side * PARALLEL_OFFSET * Math.sin(rad) };
}

const placedRunways = computed(() => props.runways.map(runway => ({
    ...runway,
    offset: getRunwayOffset(runway.ident, runway.magneticBearing),
})));

/** One strip per physical runway: reciprocal ends share the axis (bearing mod 180) and the offset */
const strips = computed(() => {
    const unique = new Map<string, { key: string; bearing: number; offset: Point }>();

    for (const runway of placedRunways.value) {
        const axis = Math.round((((runway.magneticBearing % 180) + 180) % 180) / 5);
        const key = `${ axis }:${ Math.round(runway.offset.x) }:${ Math.round(runway.offset.y) }`;
        if (!unique.has(key)) unique.set(key, { key, bearing: runway.magneticBearing, offset: runway.offset });
    }

    return [...unique.values()];
});

/** Runway designators are painted at the threshold, i.e. at the end opposite to the direction of travel */
const runwayLabels = computed(() => placedRunways.value.map(runway => {
    const point = polar(runway.magneticBearing + 180, (RUNWAY_LENGTH / 2) + 11);
    return {
        ident: runway.ident,
        status: runway.favoured ? 'favoured' : runway.active ? 'active' : 'default',
        x: point.x + runway.offset.x,
        y: point.y + runway.offset.y,
    };
}));

const directionText = computed(() => {
    if (!props.wind) return '---';
    if (isCalm.value) return 'CALM';
    if (windDirection.value === null) return 'VRB';
    return `${ formatHeading(windDirection.value) }°`;
});

const speedText = computed(() => {
    const wind = props.wind;
    if (!wind || isCalm.value) return '';
    return `${ wind.speed }${ wind.gust ? `G${ wind.gust }` : '' } ${ wind.unit }`;
});

const ariaLabel = computed(() => `Wind ${ directionText.value } ${ speedText.value }`.trim());
</script>

<style scoped lang="scss">
.awos-dial {
    width: 100%;
    max-width: 234px;
    height: auto;

    &_ring {
        fill: $darkGray900;
        stroke: $darkGray600;
        stroke-width: 1;
    }

    &_tick {
        stroke: $darkGray400;
        stroke-width: 1;

        &--major {
            stroke: $lightGray500;
            stroke-width: 1.5;
        }
    }

    &_cardinal {
        font-size: 11px;
        font-weight: 600;
        fill: $lightGray500;
    }

    &_sector {
        fill: none;
        stroke: varToRgba('blue500', 0.7);
        stroke-linecap: round;
        stroke-width: 7;
    }

    &_runway {
        fill: $darkGray600;
        stroke: $darkGray400;
        stroke-width: 1;

        &_centerline {
            stroke: $lightGray500;
            stroke-dasharray: 5 5;
            stroke-width: 1;
        }

        &_label {
            font-size: 11px;
            font-weight: 700;
            fill: $lightGray500;

            &--favoured {
                fill: $green500;
            }

            &--active {
                fill: $lightGray100;
            }
        }
    }

    &_wind {
        fill: $red500;
        stroke: $red500;
        stroke-width: 3;
    }

    &_readout {
        fill: $darkGray800;
        stroke: $darkGray600;
        stroke-width: 1;

        &_direction {
            font-size: 14px;
            font-weight: 700;
            fill: $lightGray100;
        }

        &_speed {
            font-size: 10px;
            font-weight: 600;
            fill: $lightGray200;
        }
    }
}
</style>
