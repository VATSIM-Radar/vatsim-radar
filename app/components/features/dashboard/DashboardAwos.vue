<template>
    <div class="dashboard-awos">
        <div class="dashboard-awos_head">
            <div
                class="dashboard-awos_head_toggle"
                @click="collapsed = !collapsed"
            >
                <arrow-top-icon
                    class="dashboard-awos_head_chevron"
                    :class="{ 'dashboard-awos_head_chevron--collapsed': collapsed }"
                />
                <span class="dashboard-awos_head_title">AWOS</span>
                <ui-text
                    v-if="icao"
                    color="lightGray500"
                    type="caption"
                >
                    {{ icao }}
                </ui-text>
            </div>
            <ui-select
                v-if="!collapsed && airportItems.length > 1"
                v-model="selectedAirport"
                class="dashboard-awos_head_airport"
                :items="airportItems"
                width="120px"
            />
        </div>

        <template v-if="!collapsed">
            <ui-text
                v-if="!metar"
                color="lightGray500"
                type="caption"
            >
                No METAR available for {{ icao }}
            </ui-text>

            <template v-else>
                <div class="dashboard-awos_main">
                    <div class="dashboard-awos_wind">
                        <dashboard-awos-wind-dial
                            :runways="dialRunways"
                            :variation="variation"
                            :wind="metar.wind"
                        />
                        <div class="dashboard-awos_wind_details">
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

                    <div class="dashboard-awos_tiles">
                        <div
                            v-for="tile in tiles"
                            :key="tile.key"
                            class="dashboard-awos_tile"
                            :class="{
                                'dashboard-awos_tile--wide': tile.wide,
                                'dashboard-awos_tile--changed': tile.alert,
                            }"
                            :title="tile.alert ? 'Click to acknowledge' : undefined"
                            @click="tile.alert && acknowledgeQnh()"
                        >
                            <ui-text
                                color="lightGray500"
                                type="caption"
                            >
                                {{ tile.title }}
                            </ui-text>
                            <div
                                v-if="tile.key === 'category'"
                                class="dashboard-awos_tile_category"
                            >
                                <ui-chip
                                    :color="categoryColors[category!]"
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
                                class="dashboard-awos_tile_value"
                                :class="{
                                    'dashboard-awos_tile_value--big': tile.big,
                                    'dashboard-awos_tile_value--small': tile.small,
                                }"
                            >
                                {{ tile.value }}
                                <span
                                    v-if="tile.unit"
                                    class="dashboard-awos_tile_unit"
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

                <div class="dashboard-awos_runways">
                    <div class="dashboard-awos_runways_head">
                        <ui-text type="caption-medium">
                            Runways
                        </ui-text>
                        <ui-text
                            color="lightGray500"
                            type="caption"
                        >
                            {{ runwaysSource }}
                        </ui-text>
                        <div
                            v-if="runways.length"
                            class="dashboard-awos_runways_controls"
                        >
                            <ui-button
                                v-if="isManual"
                                size="S"
                                type="secondary"
                                @click="resetRunways"
                            >
                                Auto
                            </ui-button>
                            <ui-select
                                :items="runwayItems"
                                :model-value="selectedRunways"
                                multiple
                                placeholder="Select runways"
                                width="160px"
                                @update:modelValue="selectedRunways = $event as string[]"
                            />
                        </div>
                    </div>

                    <ui-text
                        v-if="!runwaysLoading && !runways.length"
                        color="lightGray500"
                        type="caption"
                    >
                        No runway data for {{ icao }}
                    </ui-text>

                    <div
                        v-else-if="rows.length"
                        class="dashboard-awos_table"
                    >
                        <div class="dashboard-awos_table_row dashboard-awos_table_row--head">
                            <span>Runway</span>
                            <span>Head / tail</span>
                            <span>Crosswind</span>
                            <span>Sector max</span>
                            <span>QFE THR</span>
                        </div>
                        <div
                            v-for="row in tableRows"
                            :key="row.ident"
                            class="dashboard-awos_table_row"
                        >
                            <div class="dashboard-awos_table_runway">
                                <span class="dashboard-awos_strong">{{ row.ident }}</span>
                                <ui-text
                                    color="lightGray500"
                                    type="caption"
                                >
                                    {{ formatHeading(row.magneticBearing) }}°
                                </ui-text>
                                <ui-chip
                                    v-if="row.favoured"
                                    color="green500"
                                    text-type="caption-medium"
                                >
                                    Wind
                                </ui-chip>
                                <ui-chip
                                    v-if="row.atisDeparture"
                                    text-type="caption-medium"
                                >
                                    DEP
                                </ui-chip>
                                <ui-chip
                                    v-if="row.atisArrival"
                                    text-type="caption-medium"
                                >
                                    ARR
                                </ui-chip>
                            </div>
                            <span
                                class="dashboard-awos_component"
                                :class="{
                                    'dashboard-awos_component--head': row.wind?.steady && !isTailwind(row.wind),
                                    'dashboard-awos_component--tail': isTailwind(row.wind),
                                    'dashboard-awos_component--limit': row.limits.tailwind,
                                }"
                                :title="row.limits.tailwind ? `Tailwind above ${ RUNWAY_TAILWIND_LIMIT_KT } kt (gusts included)` : undefined"
                            >
                                <template v-if="row.wind?.steady && round(row.wind.steady.headwind) !== 0">
                                    {{ isTailwind(row.wind) ? '▲' : '▼' }}
                                </template>
                                {{ formatHeadwind(row.wind) }}
                            </span>
                            <span
                                class="dashboard-awos_component"
                                :class="{ 'dashboard-awos_component--limit': row.limits.crosswind }"
                                :title="row.limits.crosswind ? `Crosswind above ${ RUNWAY_CROSSWIND_LIMIT_KT } kt (gusts included)` : undefined"
                            >
                                <template v-if="row.wind?.steady && round(row.wind.steady.crosswind) !== 0">
                                    {{ row.wind.steady.crosswind > 0 ? '◀' : '▶' }}
                                </template>
                                {{ formatCrosswind(row.wind) }}
                            </span>
                            <span
                                class="dashboard-awos_component"
                                :class="{ 'dashboard-awos_component--limit': row.limits.sector }"
                                :title="row.limits.sector ? 'Crosswind or tailwind above the limits somewhere in the variable sector' : undefined"
                            >
                                <template v-if="row.wind?.worst">
                                    X {{ round(row.wind.worst.crosswind) }}<template v-if="row.wind.worst.tailwind >= 0.5">
                                        / <span class="dashboard-awos_component--tail">T {{ round(row.wind.worst.tailwind) }}</span>
                                    </template>
                                    {{ speedUnit }}
                                </template>
                                <template v-else>—</template>
                            </span>
                            <span class="dashboard-awos_component">
                                {{ metar.altimeter && Number.isFinite(row.elevation) ? formatAltimeter(getQfe(metar.altimeter, row.elevation), metar.altimeter.unit) : '—' }}
                            </span>
                        </div>
                    </div>

                    <ui-text
                        v-if="tableRows.some(row => row.limits.crosswind || row.limits.tailwind || row.limits.sector)"
                        color="lightGray500"
                        type="caption"
                    >
                        Highlighted: above ICAO runway selection limits (crosswind {{ RUNWAY_CROSSWIND_LIMIT_KT }} kt, tailwind {{ RUNWAY_TAILWIND_LIMIT_KT }} kt, gusts included)
                    </ui-text>
                </div>

                <div class="dashboard-awos_footer">
                    <code class="dashboard-awos_footer_metar">{{ rawMetar }}</code>
                    <div class="dashboard-awos_footer_meta">
                        <span
                            v-if="observedText"
                            :class="{ 'dashboard-awos_stale': isStale }"
                        >
                            {{ observedText }}
                        </span>
                        <span v-if="sunText">{{ sunText }}</span>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { AltimeterUnit, DistanceUnit, RunwayInfoUnit, SpeedUnit, ValueIndicator } from 'metar-taf-parser';
import type { StoreOverlayAirport } from '~/store/map';
import { useDashboard } from '~/composables/dashboard';
import { useAirportAwos } from '~/composables/vatsim/awos';
import { useAirportTime } from '~/composables/vatsim/airport-time';
import { useDataStore } from '~/composables/render/storage';
import {
    altimeterToHpa,
    formatAltimeter,
    formatClouds,
    formatHeading,
    formatTrends,
    formatWeatherConditions,
    getCeiling,
    getDensityAltitude,
    getFlightCategory,
    getQfe,
    getRelativeHumidity,
    getRunwayWindLimits,
    hpaToMmHg,
    isCalmWind,
    RUNWAY_CROSSWIND_LIMIT_KT,
    RUNWAY_TAILWIND_LIMIT_KT,
    speedToKnots,
    trueToMagnetic,
} from '~/utils/shared/awos';
import type { FlightCategory, RunwayWind } from '~/utils/shared/awos';
import type { SelectItem } from '~/types/components/select';
import type { ColorsList } from '~/utils/colors';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import DashboardAwosWindDial from '~/components/features/dashboard/DashboardAwosWindDial.vue';
import type { AwosDialRunway } from '~/composables/vatsim/awos';
import ArrowTopIcon from '@/assets/icons/kit/arrow-top.svg?component';

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard, sortByPriorityAirports } = useDashboard();
const dataStore = useDataStore();

const collapsed = useLocalStorage('dashboard-awos-collapsed', false);

const airportIcaos = computed(() => sortByPriorityAirports(activeDashboard.value?.airports ?? [], airport => airport.icao).map(airport => airport.icao));
const airportItems = computed<SelectItem<string>[]>(() => airportIcaos.value.map(icao => ({ value: icao, text: icao })));

const selectedAirport = ref<string | null>(null);
// Keep the selection valid when the dashboard airports change (first airport by default)
watch(airportIcaos, icaos => {
    if (!selectedAirport.value || !icaos.includes(selectedAirport.value)) selectedAirport.value = icaos[0] ?? null;
}, { immediate: true });

const icao = computed(() => selectedAirport.value);
const vatspyAirport = computed(() => (icao.value ? dataStore.vatspy.value?.data.keyAirports.realIcao[icao.value] ?? null : null));
const rawMetar = computed(() => (icao.value ? airportsData.value[icao.value]?.airport?.metar ?? null : null));

const {
    metar,
    observedAt,
    atis,
    runways,
    runwaysLoading,
    variation,
    elevation,
    selectedRunways,
    isManual,
    resetRunways,
    rows,
    qnhChange,
    acknowledgeQnh,
} = useAirportAwos(icao, rawMetar);

/** Runway rows with the ICAO runway selection limit checks */
const tableRows = computed(() => rows.value.map(row => ({
    ...row,
    limits: getRunwayWindLimits(row.wind, metar.value?.wind?.unit),
})));

const { sunTimes } = useAirportTime(vatspyAirport);

const runwayItems = computed<SelectItem<string>[]>(() => runways.value.map(runway => ({ value: runway.ident, text: runway.ident })));

const dialRunways = computed<AwosDialRunway[]>(() => rows.value.map(row => ({
    ident: row.ident,
    magneticBearing: row.magneticBearing,
    favoured: row.favoured,
    active: row.atisArrival || row.atisDeparture,
})));

const runwaysSource = computed(() => {
    if (isManual.value) return 'Manual selection';

    const hasWind = rows.value.some(row => row.favoured);
    const hasAtis = rows.value.some(row => row.atisArrival || row.atisDeparture);
    if (hasWind && hasAtis) return 'Wind-favoured + ATIS';
    if (hasWind) return 'Wind-favoured';
    if (hasAtis) return 'ATIS';
    return 'All runways';
});

const round = (value: number) => Math.abs(Math.round(value));

const speedUnit = computed(() => metar.value?.wind?.unit ?? 'KT');

/** The dial shows magnetic wind; the true direction is listed below it when it differs */
const trueWind = computed(() => {
    const wind = metar.value?.wind;
    if (!wind || isCalmWind(wind) || typeof wind.degrees !== 'number' || variation.value === null) return null;
    return `${ formatHeading(wind.degrees) }°`;
});

const variableSector = computed(() => {
    const wind = metar.value?.wind;
    if (typeof wind?.minVariation !== 'number' || typeof wind.maxVariation !== 'number') return null;
    const convert = (value: number) => formatHeading(variation.value === null ? value : trueToMagnetic(value, variation.value));
    return `${ convert(wind.minVariation) }°–${ convert(wind.maxVariation) }°`;
});

/** Wind in knots for METARs reporting MPS or KM/H */
const windInKnots = computed(() => {
    const wind = metar.value?.wind;
    if (!wind || isCalmWind(wind) || !wind.unit || wind.unit === SpeedUnit.Knot) return null;
    const kt = (value: number) => Math.round(speedToKnots(value, wind.unit));
    return `${ kt(wind.speed) }${ wind.gust ? `G${ kt(wind.gust) }` : '' } KT`;
});

const visibilityText = computed(() => {
    const value = metar.value;
    if (!value) return null;
    if (value.cavok) return 'CAVOK';
    if (!value.visibility) return null;

    const { visibility } = value;
    let text: string;

    if (visibility.unit === DistanceUnit.Meters) {
        text = visibility.value >= 9999 ? '10 km+' : `${ visibility.value } m`;
    }
    else {
        const prefix = visibility.indicator === ValueIndicator.GreaterThan ? '>' : visibility.indicator === ValueIndicator.LessThan ? '<' : '';
        text = `${ prefix }${ visibility.value } SM`;
    }

    if (visibility.min) text += ` (min ${ visibility.min.value } m ${ visibility.min.direction })`;

    return text;
});

const rvrText = computed(() => {
    const ranges = metar.value?.runwaysInfo.filter(info => 'minRange' in info) ?? [];
    return ranges.map(info => `${ info.name } ${ info.minRange }${ info.maxRange ? `V${ info.maxRange }` : '' }${ info.unit === RunwayInfoUnit.Feet ? 'FT' : 'm' }`).join(', ') || null;
});

const category = computed<FlightCategory | null>(() => (metar.value ? getFlightCategory(metar.value) : null));
const categoryColors: Record<FlightCategory, ColorsList> = {
    VFR: 'green500',
    MVFR: 'blue500',
    IFR: 'red500',
    LIFR: 'purple500',
};

const densityAltitude = computed(() => {
    const value = metar.value;
    if (!value?.altimeter || typeof value.temperature !== 'number' || elevation.value === null) return null;
    return `${ Math.round(getDensityAltitude(value.altimeter, elevation.value, value.temperature) / 10) * 10 } ft`;
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

/** Same pressure in the other common units, e.g. "1013 hPa · 29.91 inHg" style secondary lines */
function formatPressureUnits(value: number, unit: AltimeterUnit, units: ('hPa' | 'inHg' | 'mmHg')[]) {
    const hpa = altimeterToHpa({ value, unit });
    return units.map(target => {
        if (target === 'inHg') return `${ (hpa / 33.8639).toFixed(2) } inHg`;
        if (target === 'mmHg') return `${ Math.round(hpaToMmHg(hpa)) } mmHg`;
        return `${ Math.floor(hpa) } hPa`;
    }).join(' · ');
}

/** Weather tiles next to the wind dial. Tiles without data are left out */
const tiles = computed<AwosTile[]>(() => {
    const value = metar.value;
    if (!value) return [];

    const list: AwosTile[] = [];
    const { altimeter } = value;

    if (altimeter) {
        const isInHg = altimeter.unit === AltimeterUnit.InHg;
        const format = (pressure: number) => (isInHg ? pressure.toFixed(2) : Math.floor(pressure));

        // Show which way the QNH moved, e.g. "▲ was 1019", until the controller acknowledges it
        let alert: string | undefined;
        if (qnhChange.value) {
            const previous = qnhChange.value.previous.value;
            alert = `${ altimeter.value > previous ? '▲' : '▼' } was ${ format(previous) }`;
        }

        list.push({
            key: 'qnh',
            title: isInHg ? 'Altimeter' : 'QNH',
            value: format(altimeter.value),
            unit: isInHg ? 'inHg' : 'hPa',
            // inHg users often still need the hPa value (and vice versa) when coordinating
            sub: formatPressureUnits(altimeter.value, altimeter.unit, [isInHg ? 'hPa' : 'inHg']),
            alert,
            wide: true,
            big: true,
        });

        if (elevation.value !== null) {
            const qfe = getQfe(altimeter, elevation.value);
            list.push({
                key: 'qfe',
                title: 'QFE',
                value: format(qfe),
                unit: isInHg ? 'inHg' : 'hPa',
                // QFE is still given in mmHg in Russia and some CIS countries
                sub: formatPressureUnits(qfe, altimeter.unit, ['mmHg']),
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

    if (atis.value.letter) list.push({ key: 'atis', title: 'ATIS', value: atis.value.letter });

    if (category.value) list.push({ key: 'category', title: 'Category' });

    return list;
});

const now = ref(new Date());
let nowInterval: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
    nowInterval = setInterval(() => now.value = new Date(), 1000 * 30);
});
onBeforeUnmount(() => clearInterval(nowInterval));
const observedMinutes = computed(() => (observedAt.value ? Math.max(0, Math.floor((now.value.getTime() - observedAt.value.getTime()) / 60000)) : null));
// METARs are normally issued every 30 or 60 minutes; anything older is likely outdated
const isStale = computed(() => (observedMinutes.value ?? 0) > 70);
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
        sun.sunrise.utc && `SR ${ sun.sunrise.utc }z`,
        sun.sunset?.utc && `SS ${ sun.sunset.utc }z`,
    ].filter(Boolean).join(' · ');
});

/**
 * Components that decide head/tail and left/right. Gusts blow from the same direction as the steady wind but are stronger,
 * so they are used when reported: a steady component rounding to 0 must not hide e.g. a 3 kt tailwind gust ("T 0 G3")
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
.dashboard-awos {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &_head {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        &_toggle {
            cursor: pointer;
            display: flex;
            gap: 8px;
            align-items: center;
        }

        &_chevron {
            transform: rotate(0deg);
            width: 12px;
            min-width: 12px;
            transition: 0.3s;

            &--collapsed {
                transform: rotate(180deg);
            }
        }

        &_title {
            font-size: 14px;
            font-weight: 700;
            color: $lightGray200;
        }
    }

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
        flex: 0 1 234px;
        flex-direction: column;
        gap: 4px;
        align-items: center;

        min-width: 180px;

        &_details {
            display: flex;
            gap: 12px;
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

        &_controls {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-left: auto;
        }
    }

    &_table {
        overflow: hidden;
        border: 1px solid $darkGray800;
        border-radius: 8px;

        &_row {
            display: grid;
            grid-template-columns: minmax(110px, 1.4fr) repeat(4, minmax(0, 1fr));
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
            justify-self: start;
            padding: 2px 6px;
            border-radius: 4px;
            background: varToRgba('red500', 0.2);
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
        }

        &_meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;

            font-size: 11px;
            color: $lightGray500;
        }
    }
}
</style>
