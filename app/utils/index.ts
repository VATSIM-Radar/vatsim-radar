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

export function getZoomScaleMultiplier(
    zoom: number,
    baseScale: number = 1,
    iconPixelWidth?: number,
    latitude: number = 0,
    isPilotOnGround: boolean = false,
    minVisiblePixels = 8,
): number {
    if (typeof zoom !== 'number' || Number.isNaN(zoom)) return 1;

    if (typeof iconPixelWidth === 'number' && iconPixelWidth > 0) {
        // meters-per-pixel estimate for Web Mercator at given latitude and zoom
        const initialResolution = 156543.03392804097; // meters per pixel at zoom 0 (equator)
        const metersPerPixel = (initialResolution * Math.cos(latitude * Math.PI / 180)) / Math.pow(2, zoom);

        if (!metersPerPixel || metersPerPixel <= 0) return 1;

        const desiredMeters = iconPixelWidth * 2;

        const realMultiplier = desiredMeters / (iconPixelWidth * baseScale * metersPerPixel);

        const clampedReal = Math.min(Math.max(realMultiplier, 0.01), 10);

        const heuristicAtZoom = (() => {
            const minZoom = 2;
            const baselineZoom = 14.5;
            const maxZoom = 24;
            const minMultiplier = 0.55;
            const baselineMultiplier = 1.2;
            const maxMultiplier = 6;
            const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);

            if (clampedZoom <= baselineZoom) {
                const ratio = (clampedZoom - minZoom) / (baselineZoom - minZoom);
                const interpolated = (baselineMultiplier - minMultiplier) * ratio;
                return minMultiplier + interpolated;
            }

            const ratio = (clampedZoom - baselineZoom) / (maxZoom - baselineZoom);
            const interpolated = (maxMultiplier - baselineMultiplier) * ratio;
            return baselineMultiplier + interpolated;
        })();

        const thresholdZoom = 16;
        const transitionRange = 1;

        let resultMultiplier: number;
        if (isPilotOnGround) {
            if (zoom >= thresholdZoom) resultMultiplier = clampedReal;
            else {
                resultMultiplier = clampedReal * Math.min(((Math.pow((zoom - 16), 2) / 3) + 1), 4);
            }
        }
        else if (zoom <= thresholdZoom) {
            resultMultiplier = heuristicAtZoom;
        }
        else if (zoom > thresholdZoom && zoom < thresholdZoom + transitionRange) {
            const tRaw = (zoom - thresholdZoom) / transitionRange;
            const t = (tRaw * tRaw) * (3 - (2 * tRaw)); // smoothstep
            resultMultiplier = (heuristicAtZoom * (1 - t)) + (clampedReal * t);
        }
        else {
            resultMultiplier = clampedReal;
        }

        const minMultNeeded = minVisiblePixels / (iconPixelWidth * baseScale);
        if (resultMultiplier < minMultNeeded) resultMultiplier = minMultNeeded;

        return resultMultiplier;
    }

    // previous behaviour when icon width unknown
    const minZoom = 2;
    const baselineZoom = 14.5;
    const maxZoom = 24;
    const minMultiplier = 0.55;
    const baselineMultiplier = 1.2;
    const maxMultiplier = 6;
    const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);

    if (clampedZoom <= baselineZoom) {
        const ratio = (clampedZoom - minZoom) / (baselineZoom - minZoom);
        const interpolated = (baselineMultiplier - minMultiplier) * ratio;
        return minMultiplier + interpolated;
    }

    const ratio = (clampedZoom - baselineZoom) / (maxZoom - baselineZoom);
    const interpolated = (maxMultiplier - baselineMultiplier) * ratio;
    return baselineMultiplier + interpolated;
}
