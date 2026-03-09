// meters-per-pixel estimate for Web Mercator at given latitude and zoom
import { MAX_MAP_ZOOM } from '~/utils/shared';
import { useMapStore } from '~/store/map';

const INITIAL_RESOLUTION = 156543.03392804097;

type GetZoomScaleMultiplier = {
    zoom: number;
    baseScale?: number;
    iconPixelWidth?: number;
    latitude?: number;
    isPilotOnGround?: boolean;
    minVisiblePixels?: number;
};

export function getZoomScaleMultiplier(params: GetZoomScaleMultiplier): number {
    let { zoom, baseScale = 1, iconPixelWidth, latitude = 0, isPilotOnGround = false, minVisiblePixels = 8 } = params;

    iconPixelWidth ||= 20;

    if (typeof zoom !== 'number' || Number.isNaN(zoom)) return 1;

    const metersPerPixel = (INITIAL_RESOLUTION * Math.cos(latitude * Math.PI / 180)) / Math.pow(2, zoom);

    if (!metersPerPixel || metersPerPixel <= 0) return 1;

    const desiredMeters = iconPixelWidth * 2;

    const realMultiplier = desiredMeters / (iconPixelWidth * baseScale * metersPerPixel);

    const clampedReal = Math.min(Math.max(realMultiplier, 0.01), 20);

    const heuristicAtZoom = (() => {
        const minZoom = 2;
        const baselineZoom = 18.5;
        const maxZoom = MAX_MAP_ZOOM;
        const minMultiplier = 0.55;
        const baselineMultiplier = 2;
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

    const thresholdZoomGround = 16;

    let resultMultiplier: number;
    if (isPilotOnGround) {
        if (zoom >= thresholdZoomGround) resultMultiplier = clampedReal;
        else {
            resultMultiplier = clampedReal * Math.min(((Math.pow((zoom - 16), 2) / 3) + 1), 4);
        }
    }
    else {
        resultMultiplier = heuristicAtZoom;
    }

    const minMultNeeded = minVisiblePixels / (iconPixelWidth * baseScale);
    if (resultMultiplier < minMultNeeded) resultMultiplier = minMultNeeded;

    return resultMultiplier;
}

export function getResolvedScale({ scale, width, height, onGround }: {
    scale?: number | null; width: number; height: number; onGround?: boolean;
}): [width: number, height: number, scale: number] {
    let resolvedScale = typeof scale === 'number' ? scale : (useStore().mapSettings.aircraftScale ?? 1);

    if (resolvedScale > 10) resolvedScale = 10;

    let scaledWidth = width * resolvedScale;
    let minWidth: number = 0;

    if (useMapStore().zoom > 8) minWidth = 15;

    if (!onGround && scaledWidth < minWidth) {
        scaledWidth = minWidth;
        resolvedScale = scaledWidth / width;
    }

    return [scaledWidth, height * resolvedScale, resolvedScale];
}
