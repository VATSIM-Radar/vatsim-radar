import type VectorLayer from 'ol/layer/Vector';
import { Text, Stroke, Style, Fill } from 'ol/style';
import { isMapFeature } from '~/utils/map/entities';
import type { FeatureAirportSectorVGProperties } from '~/utils/map/entities';
import type { ColorsListRgb } from '~/utils/colors';
import type { SettingsColorType } from '~/composables/settings/colors';
import { getCurrentThemeHexColor } from '~/composables';
import { Point } from 'ol/geom.js';
import type { Coordinate } from 'ol/coordinate.js';
import type { Geometry } from 'ol/geom.js';
import { FEATURES_Z_INDEX } from '~/composables/render';

const styleFillCache: Record<string, Fill> = {};
const styleCache: Record<string, Style | Style[]> = {};
const geometryCache: Record<string, Geometry> = {};

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

function buildFirStyle({ color, settingsColor, hovered, label, secondLine, dashed, booking, labelCoordinate }: {
    color: ColorsListRgb;
    settingsColor?: SettingsColorType;
    dashed: boolean;
    booking: boolean;
    hovered: boolean;
    label?: string;
    secondLine?: string;
    labelCoordinate: Coordinate;
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

        cachedStyle = [
            new Style({
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
                zIndex: FEATURES_Z_INDEX.SECTORS_LABEL,
            }),
            new Style({
                geometry: new Point(labelCoordinate),
                text: label
                    ? new Text({
                        font: getTextFont('caption-medium'),
                        text: label,
                        padding: [3, 2, 3, 4],
                        fill: getCachedFill(userColor ?? getCurrentThemeHexColor(color)),
                        backgroundFill: getCachedFill(getCurrentThemeHexColor('darkGray900')),
                        backgroundStroke: new Stroke({
                            color: `rgba(${ userColor || getCurrentThemeRgbColor(color).join(',') }, 1)`,
                            width: 1,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }),
                        declutterMode: 'declutter',
                    })
                    : undefined,
                zIndex: FEATURES_Z_INDEX.SECTORS_LABEL,
            }),
        ];

        if (!label && useStore().localSettings.filters?.layers?.layer === 'basic') {
            cachedStyle[0].getStroke()?.setColor(`rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`);
        }

        if (secondLine) {
            cachedStyle = [
                ...cachedStyle,
                new Style({
                    geometry: new Point(labelCoordinate),
                    text: label
                        ? new Text({
                            font: getTextFont('caption-medium'),
                            text: label,
                            offsetY: 17,
                            fill: getCachedFill(userColor ?? getCurrentThemeHexColor(color)),
                            declutterMode: 'declutter',
                            backgroundFill: getCachedFill(getCurrentThemeHexColor('darkGray900')),
                            padding: [1, 1, 1, 4],
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
            const key = JSON.stringify(labelCoordinate);
            geometryCache[key] ??= new Point(labelCoordinate);

            cachedStyle[1].getText()!.setText(label);
            cachedStyle[1].setGeometry(geometryCache[key]);
            cachedStyle[2]?.getText()!.setText(secondLine);
            cachedStyle[2]?.setGeometry(geometryCache[key]);
        }
    }

    return cachedStyle;
}

const vatglassesStyle = ({ colour, max, vgSectorId, positionId }: FeatureAirportSectorVGProperties): Style => {
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
        text: positionId
            ? new Text({
                font: getTextFont('caption-medium'),
                text: positionId,
                padding: [3, 2, 3, 4],
                fill: getCachedFill(`rgba(${ rgba }, 1)`),
                /* backgroundFill: getCachedFill(getCurrentThemeHexColor('darkGray900')),
                backgroundStroke: new Stroke({
                    color: `rgba(${ userColor || getCurrentThemeRgbColor(color).join(',') }, 1)`,
                    width: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),*/
                declutterMode: 'declutter',
            })
            : undefined,
        zIndex: max,
    });
};

export function setSectorStyle(layer: VectorLayer) {
    layer.setStyle(feature => {
        const properties = feature.getProperties();

        if (isMapFeature('sector', properties)) {
            return buildFirStyle({
                color: properties.sectorType === 'empty' ? 'mapSectorBorder' : properties.sectorType === 'fir' ? 'green700' : 'purple600',
                settingsColor: properties.sectorType === 'empty' ? undefined : properties.sectorType === 'fir' ? 'firs' : 'uirs',
                dashed: properties.duplicated,
                booking: properties.booked,
                hovered: !!properties.selected,
                label: properties.sectorType !== 'empty' ? properties.icao : undefined,
                secondLine: properties.sectorType !== 'empty' ? properties.uir : undefined,
                labelCoordinate: properties.label,
            });
        }

        if (isMapFeature('sector-vatglasses', properties)) {
            return vatglassesStyle(properties);
        }
    });
}
