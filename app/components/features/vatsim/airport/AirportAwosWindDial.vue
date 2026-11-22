<template>
    <div
        :aria-label="ariaLabel"
        class="awos-dial"
        role="img"
    >
        <span
            v-for="tick in TICKS"
            :key="tick.bearing"
            class="awos-dial_tick"
            :class="{ 'awos-dial_tick--major': tick.major }"
            :style="{ '--bearing': `${ tick.bearing }deg` }"
        />

        <span class="awos-dial_cardinal awos-dial_cardinal--north">36</span>
        <span class="awos-dial_cardinal awos-dial_cardinal--east">09</span>
        <span class="awos-dial_cardinal awos-dial_cardinal--south">18</span>
        <span class="awos-dial_cardinal awos-dial_cardinal--west">27</span>

        <div
            v-if="sector"
            class="awos-dial_sector"
            :style="{ '--from': `${ sector.from }deg`, '--span': `${ sector.span }deg` }"
        />

        <div
            v-for="strip in strips"
            :key="strip.key"
            class="awos-dial_runway"
            :style="{ '--bearing': `${ strip.bearing }deg`, '--side': strip.side }"
        >
            <span
                v-for="label in strip.labels"
                :key="label.ident"
                class="awos-dial_runway_label"
                :class="[`awos-dial_runway_label--${ label.end }`, `awos-dial_runway_label--${ label.status }`]"
            >
                {{ label.ident }}
            </span>
        </div>

        <div
            v-if="windDirection !== null"
            class="awos-dial_wind"
            :style="{ '--bearing': `${ windDirection }deg` }"
        />

        <div class="awos-dial_readout">
            <span class="awos-dial_readout_direction">{{ directionText }}</span>
            <span
                v-if="speedText"
                class="awos-dial_readout_speed"
            >{{ speedText }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { IMetar } from 'metar-taf-parser';
import { formatHeading, isCalmWind, trueToMagnetic } from '~/utils/shared/awos';
import type { AwosRunwayWind } from '~/composables/vatsim/awos';

/*
 * Compass dial drawn with plain elements: every element is centred and turned with a CSS rotate() by its bearing,
 * so there is no trigonometry here. 0deg points up (north) and bearings grow clockwise, like CSS rotations.
 */

const props = defineProps({
    wind: {
        type: Object as PropType<IMetar['wind'] | null>,
        default: null,
    },
    /** Magnetic variation (true - magnetic, east positive). Null draws everything in true */
    magneticVariation: {
        type: Number as PropType<number | null>,
        default: null,
    },
    /** Shown runway ends */
    runways: {
        type: Array as PropType<AwosRunwayWind[]>,
        required: true,
    },
});

/** A tick every 10°, longer every 30° */
const TICKS = Array.from({ length: 36 }, (_, index) => ({ bearing: index * 10, major: index % 3 === 0 }));

const toDisplay = (bearing: number) => (props.magneticVariation === null ? bearing : trueToMagnetic(bearing, props.magneticVariation));

const isCalm = computed(() => isCalmWind(props.wind ?? undefined));

/** Wind direction drawn on the dial (magnetic when possible); null for calm or variable (VRB) wind */
const windDirection = computed(() => {
    if (!props.wind || isCalm.value || typeof props.wind.degrees !== 'number') return null;
    return toDisplay(props.wind.degrees);
});

/** Variable wind sector (e.g. 060V120), drawn clockwise from its first to its last direction */
const sector = computed(() => {
    const wind = props.wind;
    if (typeof wind?.minVariation !== 'number' || typeof wind.maxVariation !== 'number') return null;

    const from = toDisplay(wind.minVariation);
    return { from, span: ((toDisplay(wind.maxVariation) - from) + 360) % 360 };
});

/** The other end of the same runway: 06L <-> 24R, 09 <-> 27, 18C <-> 36C */
function getReciprocalIdent(ident: string) {
    const number = ((parseInt(ident) + 17) % 36) + 1;
    const suffix = { L: 'R', R: 'L', C: 'C' }[ident.at(2) ?? ''] ?? '';
    return `${ String(number).padStart(2, '0') }${ suffix }`;
}

const getLabelStatus = (runway: AwosRunwayWind) => (runway.favoured ? 'favoured' : runway.atisDeparture || runway.atisArrival ? 'active' : 'default');

/**
 * One strip per physical runway, turned to the heading of its first shown end. That end's designator sits at the
 * bottom of the strip (its threshold) and the other end's, when shown too, at the top.
 * Parallel runways are moved sideways: L to the left of the direction of travel, R to the right.
 */
const strips = computed(() => {
    const result = new Map<string, {
        key: string;
        bearing: number;
        side: number;
        labels: { ident: string; end: 'start' | 'end'; status: string }[];
    }>();

    for (const runway of props.runways) {
        const key = [runway.ident, getReciprocalIdent(runway.ident)].sort().join('/');
        const strip = result.get(key);

        if (strip) {
            strip.labels.push({ ident: runway.ident, end: 'end', status: getLabelStatus(runway) });
            continue;
        }

        result.set(key, {
            key,
            bearing: runway.magneticBearing,
            side: runway.ident.endsWith('L') ? -1 : runway.ident.endsWith('R') ? 1 : 0,
            labels: [{ ident: runway.ident, end: 'start', status: getLabelStatus(runway) }],
        });
    }

    return [...result.values()];
});

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
    --size: 234px;
    --ring-inset: 17px;
    --runway-length: 124px;
    --runway-width: 14px;
    --parallel-offset: 22px;

    position: relative;
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);

    // Compass ring
    &::before {
        content: '';

        position: absolute;
        inset: var(--ring-inset);

        border: 1px solid $darkGray600;
        border-radius: 50%;

        background: $darkGray900;
    }

    // Each tick spans from the ring edge to the centre and turns around the centre; only its top 5px is drawn
    &_tick {
        position: absolute;
        top: var(--ring-inset);
        left: 50%;
        transform-origin: bottom center;
        transform: rotate(var(--bearing));

        height: calc(50% - var(--ring-inset));

        &::before {
            content: '';

            position: absolute;
            top: 0;
            left: -0.5px;

            width: 1px;
            height: 5px;

            background: $darkGray400;
        }

        &--major::before {
            left: -0.75px;
            width: 1.5px;
            height: 9px;
            background: $lightGray500;
        }
    }

    &_cardinal {
        position: absolute;

        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        color: $lightGray500;

        &--north {
            top: 0;
            left: 50%;
            transform: translateX(-50%);
        }

        &--south {
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
        }

        &--east {
            top: 50%;
            right: 0;
            transform: translateY(-50%);
        }

        &--west {
            top: 50%;
            left: 0;
            transform: translateY(-50%);
        }
    }

    // Variable wind sector: a conic gradient from the first to the last direction, cut to a 7px band along the ring
    &_sector {
        position: absolute;
        inset: var(--ring-inset);

        border-radius: 50%;

        background: conic-gradient(from var(--from), varToRgba('blue500', 0.7) 0 var(--span), transparent var(--span));

        mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 7px));
    }

    // Centre the strip, turn it to the runway heading, then move parallel runways sideways
    &_runway {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(var(--bearing)) translateX(calc(var(--side) * var(--parallel-offset)));

        width: var(--runway-width);
        height: var(--runway-length);
        border: 1px solid $darkGray400;
        border-radius: 2px;

        background: $darkGray600;

        // Dashed centreline
        &::before {
            content: '';

            position: absolute;
            top: 6px;
            bottom: 6px;
            left: 50%;

            border-left: 1px dashed $lightGray500;
        }

        // Turned back by the runway heading, so designators stay upright
        &_label {
            position: absolute;
            left: 50%;
            transform: translateX(-50%) rotate(calc(-1 * var(--bearing)));

            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            color: $lightGray500;

            &--start {
                top: calc(100% + 4px);
            }

            &--end {
                bottom: calc(100% + 4px);
            }

            &--favoured {
                color: $green500;
            }

            &--active {
                color: $lightGray100;
            }
        }
    }

    // Wind arrow: an arrowhead on the ring pointing to the centre, plus a short shaft, turned to the wind direction
    &_wind {
        position: absolute;
        inset: var(--ring-inset);
        transform: rotate(var(--bearing));

        &::before {
            content: '';

            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);

            border-top: 22px solid $red500;
            border-right: 9px solid transparent;
            border-left: 9px solid transparent;
        }

        &::after {
            content: '';

            position: absolute;
            top: 22px;
            left: calc(50% - 1.5px);

            width: 3px;
            height: 22px;

            background: $red500;
        }
    }

    &_readout {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        display: flex;
        flex-direction: column;
        align-items: center;

        min-width: 62px;
        padding: 4px 6px;
        border: 1px solid $darkGray600;
        border-radius: 6px;

        line-height: 1.2;

        background: $darkGray800;

        &_direction {
            font-size: 14px;
            font-weight: 700;
            color: $lightGray100;
        }

        &_speed {
            font-size: 10px;
            font-weight: 600;
            color: $lightGray200;
            white-space: nowrap;
        }
    }
}
</style>
