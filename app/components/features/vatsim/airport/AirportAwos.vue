<template>
    <div class="airport-awos">
        <ui-text
            v-if="!awos.metar"
            color="lightGray500"
            type="caption"
        >
            No METAR available for {{ icao }}
        </ui-text>

        <template v-else>
            <div class="airport-awos_main">
                <div class="airport-awos_wind">
                    <airport-awos-wind-dial
                        :magnetic-variation="awos.magneticVariation"
                        :runways="awos.runways.winds"
                        :wind="awos.metar.wind ?? null"
                    />
                    <div class="airport-awos_wind_details">
                        <ui-text
                            v-if="trueWind"
                            color="lightGray500"
                            type="caption"
                        >
                            True {{ trueWind }}
                        </ui-text>
                        <ui-text
                            v-if="variableSector"
                            color="lightGray500"
                            type="caption"
                        >
                            Variable {{ variableSector }}
                        </ui-text>
                        <ui-text
                            v-if="windInKnots"
                            color="lightGray500"
                            type="caption"
                        >
                            ≈ {{ windInKnots }}
                        </ui-text>
                    </div>
                </div>

                <div class="airport-awos_tiles">
                    <div
                        v-for="tile in tiles"
                        :key="tile.key"
                        class="airport-awos_tile"
                        :class="{
                            'airport-awos_tile--wide': tile.wide,
                            'airport-awos_tile--changed': tile.alert,
                        }"
                        :title="tile.alert ? 'Click to acknowledge' : undefined"
                        @click="tile.alert && awos.qnh.acknowledge()"
                    >
                        <ui-text
                            color="lightGray500"
                            type="caption"
                        >
                            {{ tile.title }}
                        </ui-text>
                        <div
                            v-if="tile.key === 'category'"
                            class="airport-awos_tile_category"
                        >
                            <ui-chip
                                :color="CATEGORY_COLORS[category!]"
                                text-type="caption-medium"
                            >
                                {{ category }}
                            </ui-chip>
                            <ui-text
                                v-if="densityAltitude"
                                color="lightGray500"
                                type="caption"
                            >
                                DA {{ densityAltitude }}
                            </ui-text>
                        </div>
                        <div
                            v-else
                            class="airport-awos_tile_value"
                            :class="{
                                'airport-awos_tile_value--big': tile.big,
                                'airport-awos_tile_value--small': tile.small,
                            }"
                        >
                            {{ tile.value }}
                            <span
                                v-if="tile.unit"
                                class="airport-awos_tile_unit"
                            >{{ tile.unit }}</span>
                        </div>
                        <ui-text
                            v-if="tile.alert"
                            color="citrus500"
                            type="caption-medium"
                        >
                            {{ tile.alert }}
                        </ui-text>
                        <ui-text
                            v-if="tile.sub"
                            color="lightGray500"
                            type="caption"
                        >
                            {{ tile.sub }}
                        </ui-text>
                    </div>
                </div>
            </div>

            <div class="airport-awos_runways">
                <div class="airport-awos_runways_head">
                    <ui-text type="caption-medium">
                        Runways
                    </ui-text>
                    <ui-text
                        color="lightGray500"
                        type="caption"
                    >
                        {{ runwaysSource }}
                    </ui-text>
                    <ui-button
                        v-if="awos.runways.isManual"
                        class="airport-awos_runways_auto"
                        size="S"
                        type="secondary"
                        @click="awos.runways.reset()"
                    >
                        Auto
                    </ui-button>
                </div>

                <div
                    v-if="awos.runways.all.length"
                    class="airport-awos_runways_picker"
                >
                    <ui-checkbox
                        v-for="runway in awos.runways.all"
                        :key="runway.ident"
                        :model-value="awos.runways.selected.includes(runway.ident)"
                        @update:modelValue="awos.runways.toggle(runway.ident, $event)"
                    >
                        {{ runway.ident }}
                    </ui-checkbox>
                </div>

                <ui-text
                    v-if="!awos.runways.loading && !awos.runways.all.length"
                    color="lightGray500"
                    type="caption"
                >
                    No runway data for {{ icao }}
                </ui-text>

                <ui-text
                    v-else-if="awos.runways.isManual && !awos.runways.winds.length"
                    color="lightGray500"
                    type="caption"
                >
                    No runways selected
                </ui-text>

                <div
                    v-else-if="awos.runways.winds.length"
                    class="airport-awos_table"
                >
                    <div class="airport-awos_table_row airport-awos_table_row--head">
                        <span>Runway</span>
                        <span>Head / tail</span>
                        <span>Crosswind</span>
                    </div>
                    <div
                        v-for="runway in awos.runways.winds"
                        :key="runway.ident"
                        class="airport-awos_table_row"
                    >
                        <div class="airport-awos_table_runway">
                            <span class="airport-awos_strong">{{ runway.ident }}</span>
                            <ui-text
                                color="lightGray500"
                                type="caption"
                            >
                                {{ formatHeading(runway.magneticBearing) }}°
                            </ui-text>
                            <ui-chip
                                v-if="runway.favoured"
                                color="green500"
                                text-type="caption-medium"
                            >
                                Wind
                            </ui-chip>
                            <ui-chip
                                v-if="runway.atisDeparture"
                                text-type="caption-medium"
                            >
                                DEP
                            </ui-chip>
                            <ui-chip
                                v-if="runway.atisArrival"
                                text-type="caption-medium"
                            >
                                ARR
                            </ui-chip>
                        </div>

                        <div class="airport-awos_cell">
                            <span
                                class="airport-awos_component"
                                :class="{
                                    'airport-awos_component--head': runway.wind?.steady && !isTailwind(runway.wind),
                                    'airport-awos_component--tail': isTailwind(runway.wind),
                                    'airport-awos_component--limit': runway.limits.tailwind,
                                }"
                                :title="runway.limits.tailwind ? `Tailwind above ${ RUNWAY_TAILWIND_LIMIT_KT } kt (gusts included)` : undefined"
                            >
                                <template v-if="runway.wind?.steady && round(runway.wind.steady.headwind) !== 0">
                                    {{ isTailwind(runway.wind) ? '▲' : '▼' }}
                                </template>
                                {{ formatHeadwind(runway.wind) }}
                            </span>
                            <span
                                v-if="runway.wind?.worst && round(runway.wind.worst.tailwind) > 0"
                                class="airport-awos_sector"
                                :class="{ 'airport-awos_sector--limit': runway.limits.sector }"
                                :title="sectorTitle"
                            >
                                max T {{ round(runway.wind.worst.tailwind) }} {{ speedUnit }}
                            </span>
                        </div>

                        <div class="airport-awos_cell">
                            <span
                                class="airport-awos_component"
                                :class="{ 'airport-awos_component--limit': runway.limits.crosswind }"
                                :title="runway.limits.crosswind ? `Crosswind above ${ RUNWAY_CROSSWIND_LIMIT_KT } kt (gusts included)` : undefined"
                            >
                                <template v-if="runway.wind?.steady && round(runway.wind.steady.crosswind) !== 0">
                                    {{ runway.wind.steady.crosswind > 0 ? '◀' : '▶' }}
                                </template>
                                {{ formatCrosswind(runway.wind) }}
                            </span>
                            <span
                                v-if="runway.wind?.worst"
                                class="airport-awos_sector"
                                :class="{ 'airport-awos_sector--limit': runway.limits.sector }"
                                :title="sectorTitle"
                            >
                                max {{ round(runway.wind.worst.crosswind) }} {{ speedUnit }}
                            </span>
                        </div>
                    </div>
                </div>

                <ui-text
                    v-if="awos.runways.winds.some(runway => runway.limits.crosswind || runway.limits.tailwind || runway.limits.sector)"
                    color="lightGray500"
                    type="caption"
                >
                    Highlighted: above ICAO runway selection limits (crosswind {{ RUNWAY_CROSSWIND_LIMIT_KT }} kt, tailwind {{ RUNWAY_TAILWIND_LIMIT_KT }} kt, gusts included)
                </ui-text>
            </div>

            <div class="airport-awos_footer">
                <code class="airport-awos_footer_metar">{{ metar }}</code>
                <div class="airport-awos_footer_meta">
                    <span
                        v-if="observedText"
                        :class="{ 'airport-awos_stale': isStale }"
                    >
                        {{ observedText }}
                    </span>
                    <span v-if="sunText">{{ sunText }}</span>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { AltimeterUnit, DistanceUnit, RunwayInfoUnit, SpeedUnit, ValueIndicator } from 'metar-taf-parser';
import { useAirportAwos } from '~/composables/vatsim/awos';
import { useAirportTime } from '~/composables/vatsim/airport-time';
import { useDataStore } from '~/composables/render/storage';
import {
    altimeterToHpa,
    formatClouds,
    formatHeading,
    formatTrends,
    formatWeatherConditions,
    getCeiling,
    getDensityAltitude,
    getFlightCategory,
    getQfe,
    getRelativeHumidity,
    hpaToInHg,
    hpaToMmHg,
    isCalmWind,
    RUNWAY_CROSSWIND_LIMIT_KT,
    RUNWAY_TAILWIND_LIMIT_KT,
    speedToKnots,
    trueToMagnetic,
} from '~/utils/shared/awos';
import type { FlightCategory, RunwayWind } from '~/utils/shared/awos';
import type { ColorsList } from '~/utils/colors';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiCheckbox from '~/components/ui/inputs/UiCheckbox.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiText from '~/components/ui/text/UiText.vue';
import AirportAwosWindDial from '~/components/features/vatsim/airport/AirportAwosWindDial.vue';

const props = defineProps({
    icao: {
        type: String,
        required: true,
    },
    /** Raw METAR of the airport */
    metar: {
        type: String as PropType<string | null>,
        default: null,
    },
});

const CATEGORY_COLORS: Record<FlightCategory, ColorsList> = {
    VFR: 'green500',
    MVFR: 'blue500',
    IFR: 'red500',
    LIFR: 'purple500',
};

/** METARs are normally issued every 30 or 60 minutes; anything older is likely outdated */
const STALE_METAR_MINUTES = 70;
/** "9999" in a METAR means 10 km or more */
const METAR_MAX_VISIBILITY_M = 9999;

const dataStore = useDataStore();
const awos = useAirportAwos(() => props.icao, () => props.metar);

const vatspyAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.icao] ?? null);
const { sunTimes } = useAirportTime(vatspyAirport);

const round = (value: number) => Math.abs(Math.round(value));
const speedUnit = computed(() => awos.metar?.wind?.unit ?? 'KT');
const toMagnetic = (direction: number) => formatHeading(awos.magneticVariation === null ? direction : trueToMagnetic(direction, awos.magneticVariation));

const runwaysSource = computed(() => {
    if (awos.runways.isManual) return 'Manual selection';

    const hasWind = awos.runways.winds.some(runway => runway.favoured);
    const hasAtis = awos.runways.winds.some(runway => runway.atisArrival || runway.atisDeparture);
    if (hasWind && hasAtis) return 'Wind-favoured + ATIS';
    if (hasWind) return 'Wind-favoured';
    if (hasAtis) return 'ATIS';
    return 'All runways';
});

/** The dial shows magnetic wind; the true direction is listed below it */
const trueWind = computed(() => {
    const wind = awos.metar?.wind;
    if (!wind || isCalmWind(wind) || typeof wind.degrees !== 'number' || awos.magneticVariation === null) return null;
    return `${ formatHeading(wind.degrees) }°`;
});

const variableSector = computed(() => {
    const wind = awos.metar?.wind;
    if (typeof wind?.minVariation !== 'number' || typeof wind.maxVariation !== 'number') return null;
    return `${ toMagnetic(wind.minVariation) }°–${ toMagnetic(wind.maxVariation) }°`;
});

const sectorTitle = computed(() => `Highest value for any wind direction within the variable sector ${ variableSector.value }`);

/** Wind in knots for METARs reporting MPS or KM/H */
const windInKnots = computed(() => {
    const wind = awos.metar?.wind;
    if (!wind || isCalmWind(wind) || !wind.unit || wind.unit === SpeedUnit.Knot) return null;
    const kt = (value: number) => Math.round(speedToKnots(value, wind.unit));
    return `${ kt(wind.speed) }${ wind.gust ? `G${ kt(wind.gust) }` : '' } KT`;
});

const visibilityText = computed(() => {
    const value = awos.metar;
    if (!value) return null;
    if (value.cavok) return 'CAVOK';
    if (!value.visibility) return null;

    const { visibility } = value;
    let text: string;

    if (visibility.unit === DistanceUnit.Meters) {
        text = visibility.value >= METAR_MAX_VISIBILITY_M ? '10 km+' : `${ visibility.value } m`;
    }
    else {
        const prefix = visibility.indicator === ValueIndicator.GreaterThan ? '>' : visibility.indicator === ValueIndicator.LessThan ? '<' : '';
        text = `${ prefix }${ visibility.value } SM`;
    }

    if (visibility.min) text += ` (min ${ visibility.min.value } m ${ visibility.min.direction })`;

    return text;
});

const rvrText = computed(() => {
    const ranges = awos.metar?.runwaysInfo.filter(info => 'minRange' in info) ?? [];
    return ranges.map(info => `${ info.name } ${ info.minRange }${ info.maxRange ? `V${ info.maxRange }` : '' }${ info.unit === RunwayInfoUnit.Feet ? 'FT' : 'm' }`).join(', ') || null;
});

const category = computed<FlightCategory | null>(() => (awos.metar ? getFlightCategory(awos.metar) : null));

const densityAltitude = computed(() => {
    const value = awos.metar;
    if (!value?.altimeter || typeof value.temperature !== 'number' || awos.elevation === null) return null;
    return `${ Math.round(getDensityAltitude(value.altimeter, awos.elevation, value.temperature) / 10) * 10 } ft`;
});

interface AwosTile {
    key: string;
    title: string;
    value?: string | number | null;
    unit?: string;
    /** Spans two columns */
    wide?: boolean;
    /** Large value, used for the most read-out values */
    big?: boolean;
    /** Smaller value for long texts such as cloud groups */
    small?: boolean;
    /** Secondary line, e.g. the same value in another unit */
    sub?: string;
    /** Highlights the tile until acknowledged (QNH change) */
    alert?: string;
}

/** Weather tiles next to the wind dial. Tiles without data are left out */
const tiles = computed<AwosTile[]>(() => {
    const value = awos.metar;
    if (!value) return [];

    const list: AwosTile[] = [];
    const { altimeter } = value;

    if (altimeter) {
        const isInHg = altimeter.unit === AltimeterUnit.InHg;
        const format = (pressure: number) => (isInHg ? pressure.toFixed(2) : Math.floor(pressure));
        const hpa = altimeterToHpa(altimeter);

        // Show which way the QNH moved, e.g. "▲ was 1019", until the controller acknowledges it
        const change = awos.qnh.change;
        const alert = change ? `${ altimeter.value > change.previous.value ? '▲' : '▼' } was ${ format(change.previous.value) }` : undefined;

        list.push({
            key: 'qnh',
            title: isInHg ? 'Altimeter' : 'QNH',
            value: format(altimeter.value),
            unit: isInHg ? 'inHg' : 'hPa',
            // inHg users often still need the hPa value (and vice versa) when coordinating
            sub: isInHg ? `${ Math.floor(hpa) } hPa` : `${ hpaToInHg(hpa).toFixed(2) } inHg`,
            alert,
            wide: true,
            big: true,
        });

        if (awos.elevation !== null) {
            const qfe = getQfe(altimeter, awos.elevation);
            list.push({
                key: 'qfe',
                title: 'QFE',
                value: format(qfe),
                unit: isInHg ? 'inHg' : 'hPa',
                // QFE is still given in mmHg in Russia and some CIS countries
                sub: `${ Math.round(hpaToMmHg(altimeterToHpa({ ...altimeter, value: qfe }))) } mmHg`,
            });
        }
    }

    if (typeof value.temperature === 'number') {
        list.push({ key: 'temp', title: 'Temp / dew', value: `${ value.temperature } / ${ value.dewPoint ?? '-' }`, unit: '°C' });
    }

    if (typeof value.temperature === 'number' && typeof value.dewPoint === 'number') {
        list.push({ key: 'humidity', title: 'Humidity', value: Math.round(getRelativeHumidity(value.temperature, value.dewPoint)), unit: '%' });
    }

    if (visibilityText.value) list.push({ key: 'visibility', title: 'Visibility', value: visibilityText.value });

    const ceiling = value.cavok ? null : getCeiling(value);
    if (ceiling !== null) list.push({ key: 'ceiling', title: 'Ceiling', value: ceiling, unit: 'ft' });

    const clouds = formatClouds(value).join(' ');
    if (clouds) list.push({ key: 'clouds', title: 'Clouds', value: clouds, small: true, wide: clouds.length > 14 });

    const weather = formatWeatherConditions(value).join(' ');
    if (weather) list.push({ key: 'weather', title: 'Weather', value: weather, small: true });

    if (rvrText.value) list.push({ key: 'rvr', title: 'RVR', value: rvrText.value, small: true, wide: rvrText.value.length > 14 });

    const trend = formatTrends(value).join(' · ');
    if (trend) list.push({ key: 'trend', title: 'Trend', value: trend, small: true, wide: trend.length > 14 });

    if (awos.atis.letter) list.push({ key: 'atis', title: 'ATIS', value: awos.atis.letter });

    if (category.value) list.push({ key: 'category', title: 'Category' });

    return list;
});

/** Observation time from the METAR; without a time group the parser would fall back to "now" */
const observedAt = computed(() => (typeof awos.metar?.day === 'number' && typeof awos.metar.hour === 'number' ? awos.metar.issued : null));
const observedMinutes = computed(() => (observedAt.value ? Math.max(0, Math.floor((dataStore.time.value - observedAt.value.getTime()) / 60000)) : null));
const isStale = computed(() => (observedMinutes.value ?? 0) > STALE_METAR_MINUTES);
const observedText = computed(() => {
    if (!observedAt.value) return null;
    const time = `${ `0${ observedAt.value.getUTCHours() }`.slice(-2) }${ `0${ observedAt.value.getUTCMinutes() }`.slice(-2) }Z`;
    return `${ time } · ${ observedMinutes.value } min ago`;
});

const sunText = computed(() => {
    const sun = sunTimes.value;
    if (!sun?.sunrise) return null;
    if (sun.sunrise.polar) return sun.sunrise.polar;
    return [
        sun.sunrise.utc && `Sunrise ${ sun.sunrise.utc }z`,
        sun.sunset?.utc && `Sunset ${ sun.sunset.utc }z`,
    ].filter(Boolean).join(' · ');
});

/**
 * Head/tail and left/right come from the gust components when reported: gusts blow from the same direction as the
 * steady wind but are stronger, so a steady component rounding to 0 cannot hide e.g. a 3 kt tailwind gust ("T 0 G3")
 */
const getSideComponents = (wind: RunwayWind) => wind.gust ?? wind.steady;

function isTailwind(wind: RunwayWind | null) {
    const components = wind && getSideComponents(wind);
    return !!components && Math.round(components.headwind) < 0;
}

function formatHeadwind(wind: RunwayWind | null) {
    if (!wind) return '';
    if (!wind.steady) return `VRB ${ speedUnit.value }`;

    const prefix = isTailwind(wind) ? 'T' : 'H';
    // Gust component is shown in the same direction as the steady one
    const gust = wind.gust ? ` G${ round(wind.gust.headwind) }` : '';
    return `${ prefix } ${ round(wind.steady.headwind) }${ gust } ${ speedUnit.value }`;
}

function formatCrosswind(wind: RunwayWind | null) {
    if (!wind) return '';
    if (!wind.steady) return `VRB ${ speedUnit.value }`;

    const sideComponent = getSideComponents(wind)!.crosswind;
    const side = round(sideComponent) === 0 ? '' : sideComponent > 0 ? 'R ' : 'L ';
    const gust = wind.gust ? ` G${ round(wind.gust.crosswind) }` : '';
    return `${ side }${ round(wind.steady.crosswind) }${ gust } ${ speedUnit.value }`;
}
</script>

<style scoped lang="scss">
// The layout follows the width of this component (container query below), so it always takes the full width it is given
.airport-awos {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 12px;

    width: 100%;

    &_strong {
        font-weight: 700;
        color: $lightGray100;
    }

    &_stale {
        color: $citrus500;
    }

    &_main {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-start;
    }

    &_wind {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 4px;
        align-items: center;

        &_details {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 12px;
            justify-content: center;
        }
    }

    &_tiles {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        flex: 1 1 280px;
        gap: 8px;
    }

    &_tile {
        display: flex;
        flex-direction: column;
        gap: 2px;

        min-width: 0;
        padding: 8px 10px;
        border-radius: 8px;

        background: $darkGray900;

        &--wide {
            grid-column: span 2;
        }

        &--changed {
            cursor: pointer;
            background: varToRgba('citrus500', 0.12);
            box-shadow: inset 0 0 0 1px $citrus500;
        }

        &_value {
            overflow: hidden;

            font-size: 18px;
            font-weight: 700;
            color: $lightGray100;
            text-overflow: ellipsis;
            white-space: nowrap;

            &--big {
                font-size: 28px;
                line-height: 1.1;
            }

            &--small {
                font-size: 13px;
                white-space: normal;
            }
        }

        &_unit {
            font-size: 12px;
            font-weight: 500;
            color: $lightGray500;
        }

        &_category {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
    }

    &_runways {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_head {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }

        &_auto {
            margin-left: auto;
        }

        &_picker {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
        }
    }

    &_table {
        overflow: hidden;
        border: 1px solid $darkGray800;
        border-radius: 8px;

        &_row {
            display: grid;
            grid-template-columns: minmax(110px, 1.4fr) repeat(2, minmax(0, 1fr));
            gap: 8px;
            align-items: center;

            padding: 8px 10px;
            border-top: 1px solid $darkGray800;

            font-size: 13px;

            &--head {
                border-top: none;
                font-size: 11px;
                color: $lightGray500;
                background: $darkGray900;
            }
        }

        &_runway {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
    }

    &_cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: flex-start;
    }

    &_component {
        font-weight: 600;
        color: $lightGray200;
        white-space: nowrap;

        &--head {
            color: $green500;
        }

        &--tail {
            color: $red500;
        }

        &--limit {
            padding: 2px 6px;
            border-radius: 4px;
            background: varToRgba('red500', 0.2);
        }
    }

    // Worst case within a variable wind sector, under the steady/gust value
    &_sector {
        cursor: help;
        font-size: 11px;
        color: $lightGray500;
        white-space: nowrap;

        &--limit {
            color: $red500;
        }
    }

    &_footer {
        display: flex;
        flex-direction: column;
        gap: 4px;

        padding: 8px 10px;
        border-radius: 8px;

        background: $darkGray900;

        &_metar {
            font-family: $robotoFont;
            font-size: 12px;
            color: $lightGray100;
            letter-spacing: 0.4px;
            overflow-wrap: anywhere;
        }

        &_meta {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 12px;

            font-size: 11px;
            color: $lightGray500;
        }
    }
}

// Narrow places (phones, Conditions Request): below the dial (234px) plus three readable tile columns,
// put the dial on its own line, use two tile columns and a tighter table
@container (max-width: 600px) {
    .airport-awos {
        &_wind {
            flex-basis: 100%;
        }

        &_tiles {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            flex-basis: 100%;
        }

        &_table_row {
            grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
            gap: 6px;
            padding: 8px;
            font-size: 12px;
        }

        &_tile_value--big {
            font-size: 24px;
        }

        // Long values ("▼ H 14 G21 MPS" with a limit highlight) wrap instead of running into the next column
        &_component,
        &_sector {
            white-space: normal;
        }
    }
}
</style>
