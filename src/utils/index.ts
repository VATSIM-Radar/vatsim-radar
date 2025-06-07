import type { Feature, LineString as GeoLineString, MultiLineString as GeoMultiLineString } from 'geojson';
import { LineString, MultiLineString } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import type { VatsimBookingAtc, VatsimShortenedController } from '~/types/data/vatsim';
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

export function greatCircleGeometryToOL(feature: Feature<GeoLineString | GeoMultiLineString>) {
    return feature.geometry.type === 'LineString' ? new LineString(feature.geometry.coordinates) : new MultiLineString(feature.geometry.coordinates);
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
