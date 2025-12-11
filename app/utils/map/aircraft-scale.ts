// meters-per-pixel estimate for Web Mercator at given latitude and zoom
import { MAX_MAP_ZOOM } from '~/utils/shared';

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
    const { zoom, baseScale = 1, iconPixelWidth, latitude = 0, isPilotOnGround = false, minVisiblePixels = 8 } = params;

    if (typeof zoom !== 'number' || Number.isNaN(zoom)) return 1;

    if (typeof iconPixelWidth === 'number' && iconPixelWidth > 0) {
        const metersPerPixel = (INITIAL_RESOLUTION * Math.cos(latitude * Math.PI / 180)) / Math.pow(2, zoom);

        if (!metersPerPixel || metersPerPixel <= 0) return 1;

        const desiredMeters = iconPixelWidth * 2;

        const realMultiplier = desiredMeters / (iconPixelWidth * baseScale * metersPerPixel);

        const clampedReal = Math.min(Math.max(realMultiplier, 0.01), 20);

        const heuristicAtZoom = (() => {
            const minZoom = 2;
            const baselineZoom = 14.5;
            const maxZoom = MAX_MAP_ZOOM;
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

        const thresholdZoomGround = 16;
        const thresholdZoomAir = 14;
        const transitionRange = 1;

        let resultMultiplier: number;
        if (isPilotOnGround) {
            if (zoom >= thresholdZoomGround) resultMultiplier = clampedReal;
            else {
                resultMultiplier = clampedReal * Math.min(((Math.pow((zoom - 16), 2) / 3) + 1), 4);
            }
        }
        else if (zoom <= thresholdZoomAir) {
            resultMultiplier = heuristicAtZoom;
        }
        else if (zoom > thresholdZoomAir && zoom < thresholdZoomAir + transitionRange) {
            const tRaw = (zoom - thresholdZoomAir) / transitionRange;
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
    const maxZoom = MAX_MAP_ZOOM;
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
    const result = baselineMultiplier + interpolated;
    if (iconPixelWidth && result > iconPixelWidth * 6) return iconPixelWidth * 6;
    return result;
}
