import { AltimeterUnit, CloudQuantity, DistanceUnit, SpeedUnit } from 'metar-taf-parser';
import type { IMetar } from 'metar-taf-parser';

/**
 * METAR-derived AWOS calculations shared by client and server.
 *
 * Conventions:
 * - METAR wind direction is always referenced to TRUE north, so every wind component calculation uses runway true bearings.
 * - Magnetic values are only derived for display (what ATC reads out), using the airport magnetic variation.
 * - Speeds stay in the METAR unit (KT, MPS or KM/H); pressures stay in the METAR altimeter unit.
 */

// Unit conversions
const HPA_PER_INHG = 33.8639;
const MMHG_PER_HPA = 0.750062;
const KNOTS_PER_MPS = 1.943844;
const KMH_PER_KNOT = 1.852;
const METRES_PER_FOOT = 0.3048;
const METRES_PER_STATUTE_MILE = 1609.344;
/** METAR cloud heights and vertical visibility are given in hundreds of feet */
const METAR_HEIGHT_UNIT_FT = 100;

// International Standard Atmosphere (ISA)
const ISA_SEA_LEVEL_PRESSURE_HPA = 1013.25;
const ISA_SEA_LEVEL_TEMPERATURE_K = 288.15;
const ISA_SEA_LEVEL_TEMPERATURE_C = 15;
const ISA_LAPSE_RATE_K_PER_M = 0.0065;
const ISA_LAPSE_RATE_C_PER_FT = 0.002;
/** Exponent of the ISA barometric formula used for QFE */
const ISA_PRESSURE_EXPONENT = 5.25588;
/** Pressure altitude formula: elevation + 145366.45 * (1 - (QNH / 1013.25) ^ 0.190284), in feet */
const PRESSURE_ALTITUDE_FACTOR_FT = 145366.45;
const PRESSURE_ALTITUDE_EXPONENT = 0.190284;
/** Common approximation: density altitude grows by about 118.8 ft per °C above the ISA temperature */
const DENSITY_ALTITUDE_FT_PER_C = 118.8;

// Magnus formula coefficients (saturation vapour pressure over water)
const MAGNUS_B = 17.625;
const MAGNUS_C = 243.04;

// FAA flight category limits
const LIFR_CEILING_FT = 500;
const IFR_CEILING_FT = 1000;
const MVFR_CEILING_FT = 3000;
const LIFR_VISIBILITY_SM = 1;
const IFR_VISIBILITY_SM = 3;
const MVFR_VISIBILITY_SM = 5;
/** CAVOK means at least 10 km visibility: counted as 10 SM, which is VFR either way */
const CAVOK_VISIBILITY_SM = 10;

/** Runway ends within this angle of the most favoured one are parallel runways and favoured too */
const PARALLEL_RUNWAY_TOLERANCE_DEG = 10;
/** Runway designators that can get wind components: 01-36 with an optional L/R/C (no helipads or named runways) */
const WIND_RUNWAY_REGEX = /^(0[1-9]|[12]\d|3[0-6])[LRC]?$/;
const NAVIGRAPH_RUNWAY_PREFIX_REGEX = /^RW/;

/**
 * ICAO Doc 4444 runway selection guidance: a runway should normally not be chosen for noise abatement or preference
 * when the crosswind (gusts included) exceeds 15 kt or the tailwind (gusts included) exceeds 5 kt.
 */
export const RUNWAY_CROSSWIND_LIMIT_KT = 15;
export const RUNWAY_TAILWIND_LIMIT_KT = 5;

export interface AwosRunway {
    /** Runway designator without the Navigraph "RW" prefix, e.g. "06L" */
    ident: string;
    trueBearing: number;
    magneticBearing: number;
    /** Threshold elevation in feet */
    elevation: number;
    /** Length in feet */
    length: number;
}

export interface WindComponents {
    /** Positive = headwind, negative = tailwind */
    headwind: number;
    /** Positive = wind from the right, negative = wind from the left */
    crosswind: number;
}

export interface RunwayWind {
    /** Components with the reported mean direction and steady speed. Null when the direction is variable (VRB) */
    steady: WindComponents | null;
    /** Components with the reported mean direction and gust speed. Null without gusts or with VRB */
    gust: WindComponents | null;
    /**
     * Worst case across the reported variation sector (e.g. 210V280), using the gust speed when reported.
     * Null when there is no variation sector.
     */
    worst: { crosswind: number; tailwind: number } | null;
}

export interface RunwayWindLimits {
    /** Steady or gust crosswind above the limit */
    crosswind: boolean;
    /** Steady or gust tailwind above the limit */
    tailwind: boolean;
    /** Somewhere inside the variation sector the crosswind or tailwind goes above the limit */
    sector: boolean;
}

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

const normalizeDegrees = (deg: number) => ((deg % 360) + 360) % 360;
const toRad = (deg: number) => deg * Math.PI / 180;

/** Signed smallest difference a - b in degrees, in the range (-180, 180] */
export function getAngleDifference(a: number, b: number): number {
    const diff = normalizeDegrees(a - b);
    return diff > 180 ? diff - 360 : diff;
}

/** Converts a Navigraph runway identifier ("RW06L") to the ATC designator ("06L") */
export function getRunwayDesignator(identifier: string): string {
    return identifier.replace(NAVIGRAPH_RUNWAY_PREFIX_REGEX, '');
}

/** Helipads and non-numeric entries cannot be used for wind components */
export function isWindRunway(ident: string): boolean {
    return WIND_RUNWAY_REGEX.test(ident);
}

export function getWindComponents(windFromTrue: number, speed: number, runwayTrueBearing: number): WindComponents {
    const angle = toRad(getAngleDifference(windFromTrue, runwayTrueBearing));

    return {
        headwind: speed * Math.cos(angle),
        crosswind: speed * Math.sin(angle),
    };
}

/**
 * Returns every whole-degree wind direction inside a METAR variation sector (clockwise from min to max),
 * correctly handling sectors crossing north such as 340V030.
 */
function getVariationSector(min: number, max: number): number[] {
    const span = normalizeDegrees(max - min);
    const directions: number[] = [];
    for (let i = 0; i <= span; i++) directions.push(normalizeDegrees(min + i));
    return directions;
}

export function isCalmWind(wind: IMetar['wind']): boolean {
    return !!wind && wind.speed === 0 && !wind.gust;
}

export function getRunwayWind(wind: IMetar['wind'], runway: AwosRunway): RunwayWind | null {
    if (!wind) return null;

    if (isCalmWind(wind)) {
        return {
            steady: { headwind: 0, crosswind: 0 },
            gust: null,
            worst: null,
        };
    }

    const direction = typeof wind.degrees === 'number' ? wind.degrees : null;
    const steady = direction === null ? null : getWindComponents(direction, wind.speed, runway.trueBearing);
    const gust = direction === null || !wind.gust ? null : getWindComponents(direction, wind.gust, runway.trueBearing);

    let worst: RunwayWind['worst'] = null;

    if (typeof wind.minVariation === 'number' && typeof wind.maxVariation === 'number') {
        // Controllers have to assume any direction inside the sector, so report the strongest crosswind/tailwind it allows
        const speed = wind.gust ?? wind.speed;
        let crosswind = 0;
        let tailwind = 0;

        for (const sectorDirection of getVariationSector(wind.minVariation, wind.maxVariation)) {
            const components = getWindComponents(sectorDirection, speed, runway.trueBearing);
            crosswind = Math.max(crosswind, Math.abs(components.crosswind));
            tailwind = Math.max(tailwind, -components.headwind);
        }

        worst = { crosswind, tailwind };
    }

    return { steady, gust, worst };
}

/**
 * Picks the runway ends favoured by the wind: the end with the strongest steady headwind, plus every other end
 * pointing the same way (parallel runways).
 * Returns an empty list when the wind cannot favour a runway: no wind group, calm, variable (VRB) direction,
 * or a direct crosswind where no runway end gets at least 1 unit of headwind.
 */
export function getWindFavouredRunways(wind: IMetar['wind'], runways: AwosRunway[]): string[] {
    if (!wind || typeof wind.degrees !== 'number' || isCalmWind(wind)) return [];

    const candidates = runways.filter(runway => isWindRunway(runway.ident));
    if (!candidates.length) return [];

    const headwinds = candidates.map(runway => ({
        runway,
        headwind: getWindComponents(wind.degrees!, wind.speed, runway.trueBearing).headwind,
    }));

    const best = headwinds.reduce((a, b) => (b.headwind > a.headwind ? b : a));

    // A (near) direct crosswind does not favour either runway end; let the caller fall back to ATIS/all runways
    if (Math.round(best.headwind) <= 0) return [];

    return headwinds
        .filter(({ runway }) => Math.abs(getAngleDifference(runway.trueBearing, best.runway.trueBearing)) <= PARALLEL_RUNWAY_TOLERANCE_DEG)
        .map(({ runway }) => runway.ident);
}

/** Three-digit heading as ATC reads it out, 001-360: 5 -> "005", 0 -> "360" */
export function formatHeading(value: number): string {
    return `00${ Math.round(normalizeDegrees(value)) || 360 }`.slice(-3);
}

/** Converts a true direction to magnetic, rounded to whole degrees and reported as 001-360 like ATC does */
export function trueToMagnetic(direction: number, variation: number): number {
    const magnetic = Math.round(normalizeDegrees(direction - variation));
    return magnetic === 0 ? 360 : magnetic;
}

/** Magnus formula factor for a temperature in °C (saturation vapour pressure, without its constant multiplier) */
const getMagnusFactor = (temperature: number) => Math.exp((MAGNUS_B * temperature) / (MAGNUS_C + temperature));

/** Relative humidity in percent using the Magnus formula */
export function getRelativeHumidity(temperature: number, dewPoint: number): number {
    return Math.min(100, Math.max(0, (100 * getMagnusFactor(dewPoint)) / getMagnusFactor(temperature)));
}

export function altimeterToHpa(altimeter: NonNullable<IMetar['altimeter']>): number {
    return altimeter.unit === AltimeterUnit.InHg ? altimeter.value * HPA_PER_INHG : altimeter.value;
}

export function hpaToInHg(hpa: number): number {
    return hpa / HPA_PER_INHG;
}

/** Converts hPa to millimetres of mercury (still used for QFE in Russia and some CIS countries) */
export function hpaToMmHg(hpa: number): number {
    return hpa * MMHG_PER_HPA;
}

/**
 * QFE from QNH and an elevation in feet, using the ISA barometric formula.
 * The ratio is unit-agnostic, so the result keeps the METAR altimeter unit.
 */
export function getQfe(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number): number {
    const elevationM = elevationFt * METRES_PER_FOOT;
    return altimeter.value * ((1 - ((ISA_LAPSE_RATE_K_PER_M * elevationM) / ISA_SEA_LEVEL_TEMPERATURE_K)) ** ISA_PRESSURE_EXPONENT);
}

/** Converts a METAR wind speed to knots */
export function speedToKnots(speed: number, unit: SpeedUnit | string | undefined): number {
    if (unit === SpeedUnit.MetersPerSecond) return speed * KNOTS_PER_MPS;
    if (unit === SpeedUnit.KilometersPerHour) return speed / KMH_PER_KNOT;
    return speed;
}

/**
 * Checks the runway wind components against the ICAO runway selection limits, always in knots whatever the METAR unit.
 * Values are rounded to whole knots first, so a displayed "T 5 KT" is never flagged as above a 5 kt limit
 */
export function getRunwayWindLimits(wind: RunwayWind | null, unit: SpeedUnit | string | undefined): RunwayWindLimits {
    const kt = (value: number) => Math.round(speedToKnots(value, unit));
    const components = [wind?.steady, wind?.gust].filter(Boolean) as WindComponents[];

    return {
        crosswind: components.some(component => kt(Math.abs(component.crosswind)) > RUNWAY_CROSSWIND_LIMIT_KT),
        tailwind: components.some(component => kt(-component.headwind) > RUNWAY_TAILWIND_LIMIT_KT),
        sector: !!wind?.worst && (kt(wind.worst.crosswind) > RUNWAY_CROSSWIND_LIMIT_KT || kt(wind.worst.tailwind) > RUNWAY_TAILWIND_LIMIT_KT),
    };
}

/** METAR trend groups in plain text, e.g. ["TEMPO 4000 SHRA"] or ["NOSIG"]. Empty when the METAR has no trend */
export function formatTrends(metar: IMetar): string[] {
    if (metar.nosig) return ['NOSIG'];
    return metar.trends.map(trend => trend.raw || trend.type).filter(Boolean);
}

/** Pressure altitude in feet from QNH and an elevation in feet */
export function getPressureAltitude(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number): number {
    return elevationFt + (PRESSURE_ALTITUDE_FACTOR_FT * (1 - ((altimeterToHpa(altimeter) / ISA_SEA_LEVEL_PRESSURE_HPA) ** PRESSURE_ALTITUDE_EXPONENT)));
}

/** Density altitude in feet: pressure altitude corrected for the temperature difference from ISA */
export function getDensityAltitude(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number, temperature: number): number {
    const pressureAltitude = getPressureAltitude(altimeter, elevationFt);
    const isaTemperature = ISA_SEA_LEVEL_TEMPERATURE_C - (ISA_LAPSE_RATE_C_PER_FT * pressureAltitude);
    return pressureAltitude + (DENSITY_ALTITUDE_FT_PER_C * (temperature - isaTemperature));
}

/** Ceiling in feet: lowest broken/overcast layer or vertical visibility. Null when there is no ceiling */
export function getCeiling(metar: IMetar): number | null {
    const layers = metar.clouds
        .filter(cloud => (cloud.quantity === CloudQuantity.BKN || cloud.quantity === CloudQuantity.OVC) && typeof cloud.height === 'number')
        .map(cloud => cloud.height!);

    if (typeof metar.verticalVisibility === 'number') layers.push(metar.verticalVisibility);

    return layers.length ? Math.min(...layers) : null;
}

/** FAA flight category from ceiling and prevailing visibility. Null when visibility is not reported */
export function getFlightCategory(metar: IMetar): FlightCategory | null {
    const ceiling = metar.cavok ? null : getCeiling(metar);
    let visibilitySm: number | null = null;

    if (metar.cavok) visibilitySm = CAVOK_VISIBILITY_SM;
    else if (metar.visibility) {
        visibilitySm = metar.visibility.unit === DistanceUnit.StatuteMiles ? metar.visibility.value : metar.visibility.value / METRES_PER_STATUTE_MILE;
    }

    if (visibilitySm === null) return null;

    if ((ceiling !== null && ceiling < LIFR_CEILING_FT) || visibilitySm < LIFR_VISIBILITY_SM) return 'LIFR';
    if ((ceiling !== null && ceiling < IFR_CEILING_FT) || visibilitySm < IFR_VISIBILITY_SM) return 'IFR';
    if ((ceiling !== null && ceiling <= MVFR_CEILING_FT) || visibilitySm <= MVFR_VISIBILITY_SM) return 'MVFR';
    return 'VFR';
}

/** METAR-style three-digit height group in hundreds of feet, e.g. 4000 -> "040" */
const formatMetarHeight = (heightFt: number) => `00${ Math.round(heightFt / METAR_HEIGHT_UNIT_FT) }`.slice(-3);

/** Rebuilds METAR-style cloud groups, e.g. "BKN040CB" */
export function formatClouds(metar: IMetar): string[] {
    const layers = metar.clouds.map(cloud => {
        const height = typeof cloud.height === 'number' ? formatMetarHeight(cloud.height) : '';
        return `${ cloud.quantity }${ height }${ cloud.type ?? '' }`;
    });

    if (typeof metar.verticalVisibility === 'number') layers.push(`VV${ formatMetarHeight(metar.verticalVisibility) }`);

    return layers;
}

/** Rebuilds METAR-style present weather groups, e.g. "-SHRA" */
export function formatWeatherConditions(metar: IMetar): string[] {
    return metar.weatherConditions.map(condition => `${ condition.intensity ?? '' }${ condition.descriptive ?? '' }${ condition.phenomenons.join('') }`).filter(Boolean);
}
