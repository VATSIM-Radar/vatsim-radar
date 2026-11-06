import { AltimeterUnit, CloudQuantity, DistanceUnit, SpeedUnit } from 'metar-taf-parser';
import type { IMetar } from 'metar-taf-parser';

/**
 * METAR-derived AWOS calculations shared by client and server.
 *
 * Conventions:
 * - METAR wind direction is always referenced to TRUE north, so every wind component calculation uses runway true bearings.
 * - Magnetic values are only derived for display (what ATC reads out), using the local variation implied by runway data.
 * - Speeds stay in the METAR unit (KT, MPS or KM/H); pressures stay in the METAR altimeter unit.
 */

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
    return identifier.replace(/^RW/, '');
}

/** Helipads and non-numeric entries cannot be used for wind components */
export function isWindRunway(ident: string): boolean {
    return /^(0[1-9]|[12]\d|3[0-6])[LRC]?$/.test(ident);
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
 * pointing the same way (parallel runways, within 10°).
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
        .filter(({ runway }) => Math.abs(getAngleDifference(runway.trueBearing, best.runway.trueBearing)) <= 10)
        .map(({ runway }) => runway.ident);
}

/**
 * Local magnetic variation (true - magnetic, east positive) averaged over the airport runways.
 * Null when there are no usable runways.
 */
export function getMagneticVariation(runways: AwosRunway[]): number | null {
    const usable = runways.filter(runway => isWindRunway(runway.ident) && Number.isFinite(runway.trueBearing) && Number.isFinite(runway.magneticBearing));
    if (!usable.length) return null;

    return usable.reduce((sum, runway) => sum + getAngleDifference(runway.trueBearing, runway.magneticBearing), 0) / usable.length;
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

/** Relative humidity in percent using the Magnus formula */
export function getRelativeHumidity(temperature: number, dewPoint: number): number {
    const magnus = (t: number) => Math.exp((17.625 * t) / (243.04 + t));
    return Math.min(100, Math.max(0, (100 * magnus(dewPoint)) / magnus(temperature)));
}

export function altimeterToHpa(altimeter: NonNullable<IMetar['altimeter']>): number {
    return altimeter.unit === AltimeterUnit.InHg ? altimeter.value * 33.8639 : altimeter.value;
}

/**
 * QFE from QNH and an elevation in feet, using the ISA barometric formula.
 * The ratio is unit-agnostic, so the result keeps the METAR altimeter unit.
 */
export function getQfe(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number): number {
    const elevationM = elevationFt * 0.3048;
    return altimeter.value * ((1 - ((0.0065 * elevationM) / 288.15)) ** 5.25588);
}

/** Converts hPa to millimetres of mercury (still used for QFE in Russia and some CIS countries) */
export function hpaToMmHg(hpa: number): number {
    return hpa * 0.750062;
}

/** Converts a METAR wind speed to knots */
export function speedToKnots(speed: number, unit: SpeedUnit | string | undefined): number {
    if (unit === SpeedUnit.MetersPerSecond) return speed * 1.943844;
    if (unit === SpeedUnit.KilometersPerHour) return speed / 1.852;
    return speed;
}

/**
 * ICAO Doc 4444 runway selection guidance: a runway should normally not be chosen for noise abatement or preference
 * when the crosswind (gusts included) exceeds 15 kt or the tailwind (gusts included) exceeds 5 kt.
 */
export const RUNWAY_CROSSWIND_LIMIT_KT = 15;
export const RUNWAY_TAILWIND_LIMIT_KT = 5;

export interface RunwayWindLimits {
    /** Steady or gust crosswind above the limit */
    crosswind: boolean;
    /** Steady or gust tailwind above the limit */
    tailwind: boolean;
    /** Somewhere inside the variation sector the crosswind or tailwind goes above the limit */
    sector: boolean;
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

export function formatAltimeter(value: number, unit: AltimeterUnit): string {
    return unit === AltimeterUnit.InHg ? `${ value.toFixed(2) } inHg` : `${ Math.floor(value) } hPa`;
}

/** Pressure altitude in feet from QNH and an elevation in feet */
export function getPressureAltitude(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number): number {
    return elevationFt + (145366.45 * (1 - ((altimeterToHpa(altimeter) / 1013.25) ** 0.190284)));
}

/** Density altitude in feet, using the common approximation of 118.8 ft per °C of ISA deviation */
export function getDensityAltitude(altimeter: NonNullable<IMetar['altimeter']>, elevationFt: number, temperature: number): number {
    const pressureAltitude = getPressureAltitude(altimeter, elevationFt);
    const isaTemperature = 15 - ((2 * pressureAltitude) / 1000);
    return pressureAltitude + (118.8 * (temperature - isaTemperature));
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

    if (metar.cavok) visibilitySm = 10;
    else if (metar.visibility) {
        visibilitySm = metar.visibility.unit === DistanceUnit.StatuteMiles ? metar.visibility.value : metar.visibility.value / 1609.344;
    }

    if (visibilitySm === null) return null;

    if ((ceiling !== null && ceiling < 500) || visibilitySm < 1) return 'LIFR';
    if ((ceiling !== null && ceiling < 1000) || visibilitySm < 3) return 'IFR';
    if ((ceiling !== null && ceiling <= 3000) || visibilitySm <= 5) return 'MVFR';
    return 'VFR';
}

/** Rebuilds METAR-style cloud groups, e.g. "BKN040CB" */
export function formatClouds(metar: IMetar): string[] {
    const layers = metar.clouds.map(cloud => {
        const height = typeof cloud.height === 'number' ? `00${ Math.round(cloud.height / 100) }`.slice(-3) : '';
        return `${ cloud.quantity }${ height }${ cloud.type ?? '' }`;
    });

    if (typeof metar.verticalVisibility === 'number') layers.push(`VV${ `00${ Math.round(metar.verticalVisibility / 100) }`.slice(-3) }`);

    return layers;
}

/** Rebuilds METAR-style present weather groups, e.g. "-SHRA" */
export function formatWeatherConditions(metar: IMetar): string[] {
    return metar.weatherConditions.map(condition => `${ condition.intensity ?? '' }${ condition.descriptive ?? '' }${ condition.phenomenons.join('') }`).filter(Boolean);
}
