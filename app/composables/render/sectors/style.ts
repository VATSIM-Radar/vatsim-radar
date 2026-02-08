import type VectorLayer from 'ol/layer/Vector';
import type { Icon } from 'ol/style';
import { Stroke, Style, Fill } from 'ol/style';
import { isMapFeature } from '~/utils/map/entities';

const styleFillCache: Record<string, Fill> = {};
const styleStrokeCache: Record<string, Stroke> = {};
const styleIconCache: Record<string, Icon> = {};
const styleCache: Record<string, Style> = {};

function getCachedFill(color: string) {
    let cachedFill = styleFillCache[color];
    if (!cachedFill) {
        cachedFill = new Fill({
            color,
        });
        styleFillCache[color] = cachedFill;
    }

    return cachedFill;
}

export function setSectorStyle(layer: VectorLayer) {
    const store = useStore();

    const firColor = getSelectedColorFromSettings('firs');
    const uirColor = getSelectedColorFromSettings('uirs');
    const bookingsColor = getSelectedColorFromSettings('centerBookings');

    const firColorRaw = getSelectedColorFromSettings('firs', true);
    const uirColorRaw = getSelectedColorFromSettings('uirs', true);
    const bookingsColorRaw = getSelectedColorFromSettings('centerBookings', true);

    const defaultStyle = new Style({
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('mapSectorBorder').join(',') }, 0.5)`,
            width: 1,
        }),
        zIndex: 2,
    });

    if (store.localSettings.filters?.layers?.layer === 'basic') {
        defaultStyle.getStroke()?.setColor(`rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`);
    }

    // TODO: replace all colors

    const localStyle = new Style({
        fill: new Fill({
            color: firColor || `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
            width: 1,
        }),
        zIndex: 3,
    });

    const localStyleDashed = new Style({
        fill: new Fill({
            color: firColor || `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
            width: 1,
            lineDash: [8, 5],
            lineJoin: 'round',
        }),
        zIndex: 3,
    });

    const localBookingStyle = new Style({
        fill: new Fill({
            color: bookingsColor || `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.07)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ bookingsColorRaw || getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
            width: 1,
        }),
        zIndex: 3,
    });

    const rootStyle = new Style({
        fill: new Fill({
            color: uirColor || `rgba(${ getCurrentThemeRgbColor('info400').join(',') }, 0.07)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info400').join(',') }, 0.5)`,
            width: 1,
        }),
        zIndex: 3,
    });

    const rootStyleDashed = new Style({
        fill: new Fill({
            color: uirColor || `rgba(${ getCurrentThemeRgbColor('info400').join(',') }, 0.07)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info400').join(',') }, 0.5)`,
            width: 1,
            lineDash: [8, 5],
            lineJoin: 'round',
        }),
        zIndex: 3,
    });

    const hoveredStyle = new Style({
        fill: new Fill({
            color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success300').join(',') }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success300').join(',') }, 0.6)`,
            width: 1,
        }),
        zIndex: 5,
    });

    const hoveredBookingStyle = new Style({
        fill: new Fill({
            color: `rgba(${ bookingsColorRaw || getCurrentThemeRgbColor('lightgray100').join(',') }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ bookingsColorRaw || getCurrentThemeRgbColor('lightgray100').join(',') }, 0.6)`,
            width: 1,
        }),
        zIndex: 5,
    });

    const hoveredRootStyle = new Style({
        fill: new Fill({
            color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info600').join(',') }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info600').join(',') }, 0.6)`,
            width: 1,
        }),
        zIndex: 5,
    });

    layer.setStyle(feature => {
        const properties = feature.getProperties();

        if (isMapFeature('sector', properties)) {
            if (properties.sectorType === 'empty') {
                if (store.localSettings.filters?.layers?.layer === 'basic') {
                    if (!styleCache.emptyBasic) {
                        styleCache.emptyBasic = new Style({
                            stroke: new Stroke({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`,
                                width: 1,
                            }),
                            zIndex: 2,
                        });
                        return styleCache.emptyBasic;
                    }
                }

                if (!styleCache.empty) {
                    styleCache.empty = new Style({
                        stroke: new Stroke({
                            color: `rgba(${ getCurrentThemeRgbColor('mapSectorBorder').join(',') }, 0.5)`,
                            width: 1,
                        }),
                        zIndex: 2,
                    });
                }

                return styleCache.empty;
            }
            else if (properties.sectorType === 'fir') {
                if (properties.booked) {
                    if (!styleCache.firBooked) {
                        styleCache.firBooked = new Style({
                            fill: new Fill({
                                color: bookingsColor || `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.07)`,
                            }),
                            stroke: new Stroke({
                                color: `rgba(${ bookingsColorRaw || getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
                                width: 1,
                            }),
                            zIndex: 3,
                        });
                    }

                    return styleCache.firBooked;
                }

                if (properties.duplicated) {
                    if (!styleCache.firDuplicated) {
                        styleCache.firDuplicated = new Style({
                            fill: new Fill({
                                color: firColor || `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
                            }),
                            stroke: new Stroke({
                                color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
                                width: 1,
                                lineDash: [8, 5],
                                lineJoin: 'round',
                            }),
                            zIndex: 3,
                        });
                    }

                    return styleCache.firDuplicated;
                }

                if (!styleCache.fir) {
                    styleCache.fir = new Style({
                        fill: new Fill({
                            color: firColor || `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
                        }),
                        stroke: new Stroke({
                            color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
                            width: 1,
                        }),
                        zIndex: 3,
                    });
                }

                return styleCache.fir;
            }
        }
    });
}
