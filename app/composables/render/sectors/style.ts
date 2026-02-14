import type VectorLayer from 'ol/layer/Vector';
import { Text, Stroke, Style, Fill } from 'ol/style';
import { isMapFeature } from '~/utils/map/entities';
import type { FeatureAirportSectorVGProperties } from '~/utils/map/entities';
import type { ColorsListRgb } from '~/utils/colors';
import type { SettingsColorType } from '~/composables/settings/colors';

const styleFillCache: Record<string, Fill> = {};
const styleCache: Record<string, Style | Style[]> = {};

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

function buildFirStyle({ color, settingsColor, hovered, label, secondLine, dashed, booking }: {
    color: ColorsListRgb;
    settingsColor?: SettingsColorType;
    dashed: boolean;
    booking: boolean;
    hovered: boolean;
    label?: string;
    secondLine?: string;
}) {
    let userColor = settingsColor ? getSelectedColorFromSettings(settingsColor) : null;
    let userColorRaw = settingsColor ? getSelectedColorFromSettings(settingsColor, true) : null;

    if (booking) {
        userColor = getSelectedColorFromSettings('centerBookings') || `rgba(${ getCurrentThemeRgbColor('lightGray100').join(',') }, 0.07)`;
        userColorRaw = getSelectedColorFromSettings('centerBookings', true) || getCurrentThemeRgbColor('lightGray100').join(',');
    }

    const key = String(color) + String(settingsColor) + String(booking) + String(dashed) + String(hovered) + String(!!label) + String(!!secondLine);

    let cachedStyle = styleCache[key];

    if (!cachedStyle) {
        const textBg = getSelectedColorFromSettings('centerBg', true);
        const textColor = getSelectedColorFromSettings('centerText', true);

        cachedStyle = new Style({
            fill: label
                ? new Fill({
                    color: userColor || `rgba(${ getCurrentThemeRgbColor(color).join(',') }, ${ (hovered || booking) ? 0.2 : 0.07 })`,
                })
                : undefined,
            stroke: new Stroke({
                color: `rgba(${ userColorRaw || getCurrentThemeRgbColor(color).join(',') }, ${ (hovered || booking) ? 0.6 : 0.5 })`,
                width: 1,
                lineDash: dashed ? [8, 5] : undefined,
                lineJoin: 'round',
            }),
            // TODO: rework text placement to be geometry based
            text: label
                ? new Text({
                    font: getTextFont('caption-medium'),
                    text: label,
                    padding: [10, 7, 9, 10],
                    fill: getCachedFill(textColor ?? getCurrentThemeHexColor('lightGray200')),
                    backgroundFill: getCachedFill(textBg ?? getCurrentThemeHexColor('darkGray800')),
                    backgroundStroke: new Stroke({
                        color: `rgba(${ textColor || getCurrentThemeRgbColor('lightGray200').join(',') }, 0.1)`,
                        width: 1,
                        lineCap: 'round',
                        lineJoin: 'round',
                    }),
                    declutterMode: 'declutter',
                })
                : undefined,
            zIndex: !label ? 1 : !hovered ? 3 : 5,
        });

        if (!label && useStore().localSettings.filters?.layers?.layer === 'basic') {
            cachedStyle.getStroke()?.setColor(`rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`);
        }

        if (secondLine) {
            cachedStyle = [
                cachedStyle,
                // TODO: style
                new Style({
                    text: label
                        ? new Text({
                            font: getTextFont('caption-light'),
                            text: label,
                            padding: [-2, 10, 0, 10],
                            fill: getCachedFill(textColor ?? getCurrentThemeHexColor('lightGray200')),
                            backgroundFill: getCachedFill(textBg ?? getCurrentThemeHexColor('darkGray800')),
                            declutterMode: 'declutter',
                        })
                        : undefined,
                    zIndex: !label ? 1 : !hovered ? 3 : 5,
                }),
            ];
        }

        styleCache[key] = cachedStyle;
    }

    if (label) {
        if (Array.isArray(cachedStyle)) {
            cachedStyle[0].getText()!.setText(label);
            cachedStyle[1].getText()!.setText(secondLine);
        }
        else {
            cachedStyle.getText()!.setText(label);
        }
    }

    return cachedStyle;
}

const vatglassesStyle = ({ colour, max }: FeatureAirportSectorVGProperties): Style => {
    let rgba: string;

    try {
        rgba = hexToRgb(colour);
    }
    catch {
        rgba = getSelectedColorFromSettings('firs', true) || getCurrentThemeRgbColor('success500').join(',');
    }

    if (!styleCache.vatglasses) {
        styleCache.vatglasses = new Style({
            fill: new Fill({
                color: `rgba(${ rgba }, 0.2)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ rgba }, 0.6)`,
                width: 1,
            }),
            zIndex: max,
        });
    }

    return new Style({
        fill: new Fill({
            color: `rgba(${ rgba }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ rgba }, 0.6)`,
            width: 1,
        }),
        zIndex: max,
    });
};

export function setSectorStyle(layer: VectorLayer) {
    layer.setStyle(feature => {
        const properties = feature.getProperties();

        if (isMapFeature('sector', properties)) {
            return buildFirStyle({
                color: properties.sectorType === 'empty' ? 'mapSectorBorder' : properties.sectorType === 'fir' ? 'success500' : 'info400',
                settingsColor: properties.sectorType === 'empty' ? undefined : properties.sectorType === 'fir' ? 'firs' : 'uirs',
                dashed: properties.duplicated,
                booking: properties.booked,
                hovered: !!properties.selected,
                label: properties.sectorType !== 'empty' ? properties.icao : undefined,
                secondLine: properties.sectorType !== 'empty' ? properties.uir : undefined,
            });
        }

        if (isMapFeature('sector-vatglasses', properties)) {
            return vatglassesStyle(properties);
        }
    });
}
