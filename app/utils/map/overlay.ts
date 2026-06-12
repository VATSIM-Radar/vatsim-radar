import type { Positioning } from 'ol/Overlay.js';

// Picks the overlay corner that points back towards the aircraft based on its heading.
export function overlayPositionFromHeading(headingDeg: number): Positioning {
    const heading = ((headingDeg % 360) + 360) % 360;
    const sector = Math.floor(((heading + 22.5) % 360) / 45);

    switch (sector) {
        case 0: return 'center-left';
        case 1: return 'top-left';
        case 2: return 'top-center';
        case 3: return 'top-right';
        case 4: return 'center-right';
        case 5: return 'bottom-right';
        case 6: return 'bottom-center';
        case 7: return 'bottom-left';
        default: return 'center-left';
    }
}

interface ClampOverlayPositioningOptions {
    positioning: Positioning;
    pixel: [number, number];
    viewport: [number, number];
    popup: { width: number; height: number };
    offsetX: number;
    offsetY: number;
}

// Flips the popup to the opposite edge when its current side would overflow the viewport.
export function clampOverlayPositioning({ positioning, pixel, viewport, popup, offsetX, offsetY }: ClampOverlayPositioningOptions): Positioning {
    const [viewportWidth, viewportHeight] = viewport;
    const [px, py] = pixel;
    const { width, height } = popup;

    let [vertical, horizontal] = positioning.split('-');

    if (horizontal === 'left') {
        if (px + offsetX + width > viewportWidth && px - offsetX - width >= 0) horizontal = 'right';
    }
    else if (horizontal === 'right') {
        if (px - offsetX - width < 0 && px + offsetX + width <= viewportWidth) horizontal = 'left';
    }
    else if (px + (width / 2) > viewportWidth) horizontal = 'right';
    else if (px - (width / 2) < 0) horizontal = 'left';

    if (vertical === 'top') {
        if (py + offsetY + height > viewportHeight && py - offsetY - height >= 0) vertical = 'bottom';
    }
    else if (vertical === 'bottom') {
        if (py - offsetY - height < 0 && py + offsetY + height <= viewportHeight) vertical = 'top';
    }
    else if (py + (height / 2) > viewportHeight) vertical = 'bottom';
    else if (py - (height / 2) < 0) vertical = 'top';

    return `${ vertical }-${ horizontal }` as Positioning;
}
