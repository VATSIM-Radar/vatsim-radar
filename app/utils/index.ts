import type {
    Feature,
    LineString as GeoLineString,
    MultiLineString as GeoMultiLineString,
    MultiPolygon as GeoMultiPolygon,
    Polygon as GeoPolygon,
    Point as GeoPoint,
} from 'geojson';
import { LineString, MultiLineString, MultiPolygon, Point } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import type { VatsimBooking, VatsimBookingAtc, VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyDataFeature } from '~/types/data/vatspy';

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getHoursAndMinutes(date: number) {
    const diff = Math.abs(useDataStore().time.value - date) / (1000 * 60);

    return `${ (`0${ Math.floor(diff / 60) }`).slice(-2) }:${ (`0${ Math.floor(diff % 60) }`).slice(-2) }`;
}

export async function copyText(text: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('You are not allowed to call copyText on SSR');

    if (typeof navigator?.permissions?.query !== 'undefined' && typeof navigator?.clipboard?.writeText !== 'undefined') {
        try {
            const { state } = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
            if (state === 'granted' || state === 'prompt') {
                await navigator.clipboard.writeText(text);
                return;
            }
        }
        catch (e) {
            console.warn('copyText using navigator.permissions.query failed, falling back to legacy method', e);
        }
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    if (!success) throw new Error('Was not able to copy text');

    document.body.removeChild(textArea);
}

export function serializeClass<T extends string | null | undefined>(className: T): T {
    if (typeof className === 'string') return className.replaceAll(':', '\\:') as T;
    return className;
}

export function turfGeometryToOl(feature: Feature<GeoLineString | GeoMultiLineString | GeoPoint | GeoPolygon | GeoMultiPolygon>) {
    if (feature.geometry.type === 'LineString') return new LineString(feature.geometry.coordinates);
    if (feature.geometry.type === 'MultiLineString') return new MultiLineString(feature.geometry.coordinates);
    if (feature.geometry.type === 'Point') return new Point(feature.geometry.coordinates);
    if (feature.geometry.type === 'Polygon') return new Polygon(feature.geometry.coordinates);
    if (feature.geometry.type === 'MultiPolygon') return new MultiPolygon(feature.geometry.coordinates);

    throw new Error('Invalid geometry');
}

export function createCircle(center: Coordinate, radius: number, numPoints = 64) {
    const coords = [];
    const [lon, lat] = center;

    const latRadius = (radius / 111320);
    const lonRadius = radius / (111320 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const x = lon + (lonRadius * Math.cos(angle));
        const y = lat + (latRadius * Math.sin(angle));
        coords.push([x, y]);
    }

    coords.push(coords[0]);

    return new Polygon([coords]);
}

export function makeFakeAtcFeatureFromBooking(atc: VatsimShortenedController, booking: VatsimBookingAtc): VatSpyDataFeature[] {
    atc.booking = booking;
    makeBookingLocalTime(booking);
    return [{
        controller: atc,
        firs: [],
    }];
}

export function makeFakeAtc(booking: VatsimBooking): VatsimShortenedController {
    return {
        cid: booking.atc.cid,
        name: booking.atc.name,
        callsign: booking.atc.callsign,
        frequency: booking.atc.frequency,
        facility: booking.atc.facility,
        rating: booking.atc.rating,
        logon_time: booking.atc.logon_time,
        text_atis: booking.atc.text_atis,
    };
}

/**
 * Calculates a scale multiplier for aircraft icons based on the current map zoom level.
 * This allows icons to dynamically resize: smaller at low zoom (zoomed out) and larger at high zoom (zoomed in).
 * The scaling is linear between defined zoom thresholds.
 * @param zoom - The current map zoom level (e.g., from OpenLayers map view).
 * @returns A multiplier (0.55 to 2.1) to apply to the base aircraft scale.
 */

export function getZoomScaleMultiplier(zoom: number) {
    if (typeof zoom !== 'number' || Number.isNaN(zoom)) return 1;

    // Minimum zoom level where scaling starts (zoomed out, icons smaller)
    const minZoom = 2;
    // Baseline zoom level where scale is 1x (normal size)
    const baselineZoom = 14.5;
    // Maximum zoom level where scaling caps (zoomed in, icons larger)
    const maxZoom = 24;
    // Minimum scale multiplier (at minZoom, icons are 55% of base size)
    const minMultiplier = 0.55;
    // Baseline scale multiplier (at baselineZoom, icons are 100% of base size)
    const baselineMultiplier = 1.2;
    // Maximum scale multiplier (at maxZoom, icons are 210% of base size)
    const maxMultiplier = 6;
    // Clamp zoom to the defined range
    const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);

    if (clampedZoom <= baselineZoom) {
        // Interpolate between minZoom and baselineZoom
        const ratio = (clampedZoom - minZoom) / (baselineZoom - minZoom);
        const interpolated = (baselineMultiplier - minMultiplier) * ratio;
        return minMultiplier + interpolated;
    }

    // Interpolate between baselineZoom and maxZoom
    const ratio = (clampedZoom - baselineZoom) / (maxZoom - baselineZoom);
    const interpolated = (maxMultiplier - baselineMultiplier) * ratio;
    return baselineMultiplier + interpolated;
}
