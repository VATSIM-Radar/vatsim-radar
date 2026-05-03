import type VectorLayer from 'ol/layer/Vector';
import { Text, Stroke, Style, Fill } from 'ol/style';
import { isMapFeature } from '~/utils/map/entities';
import type { FeatureAirportSectorVGProperties } from '~/utils/map/entities';
import type { ColorsListRgb } from '~/utils/colors';
import {
    getSelectedColorTransparencyFromSettings,
} from '~/composables/settings/colors';
import type { SettingsColorType } from '~/composables/settings/colors';
import { Point } from 'ol/geom.js';
import type { Coordinate } from 'ol/coordinate.js';
import type { Geometry } from 'ol/geom.js';
import type VectorImageLayer from 'ol/layer/VectorImage';

let styleFillCache: Record<string, Fill> = {};
let styleCache: Record<string, Style | Style[]> = {};
let geometryCache: Record<string, Geometry> = {};

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

function buildFirStyle({ color, settingsColor, hovered, label, secondLine, dashed, booking, labelCoordinate, labelType, transparent }: {
    color: ColorsListRgb;
    settingsColor?: SettingsColorType;
    dashed: boolean;
    booking: boolean;
    hovered: boolean;
    label?: string;
    secondLine?: string;
    transparent?: boolean;
    labelCoordinate: Coordinate;
    labelType: boolean;
}) {
    let userColorRaw = settingsColor ? getSelectedColorFromSettings(settingsColor, true) : null;
    const userColorTransparency = settingsColor ? getSelectedColorTransparencyFromSettings(settingsColor) : null;

    if (booking) {
        userColorRaw = getSelectedColorFromSettings('centerBookings', true) || getCurrentThemeRgbColor('lightGray100').join(',');
    }

    const key = String(color) + String(settingsColor) + String(booking) + String(dashed) + String(hovered) + String(!!label) + String(!!secondLine) + String(labelType) + String(transparent);

    let cachedStyle = styleCache[key];

    if (!cachedStyle) {
        cachedStyle = [];

        if (labelType) {
            let textFill = getCachedFill(`rgba(${ getSelectedColorFromSettings('centerText', true) || getCurrentThemeRgbColor('lightGray500').join(',') }, ${ booking ? 0.4 : 1 })`);
            const textFillRaw = getSelectedColorFromSettings('centerText', true) || getCurrentThemeRgbColor('lightGray500').join(',');
            let sectorBg = getCachedFill(`rgba(${ userColorRaw || getCurrentThemeRgbColor(color).join(',') }, ${ booking ? 0.4 : 1 })`);
            let textBg = getCachedFill(getSelectedColorFromSettings('centerBg') ?? getCurrentThemeRgbColor('darkGray900'));

            if (transparent) {
                textFill = getCachedFill('transparent');
                sectorBg = getCachedFill('transparent');
                textBg = getCachedFill('transparent');
            }

            cachedStyle.push(new Style({
                geometry: new Point(labelCoordinate),
                text: label
                    ? new Text({
                        font: getTextFont('caption-medium'),
                        text: label,
                        textAlign: 'center',
                        padding: [4, 1, 2, 4],
                        fill: hovered ? getCachedFill(radarColors.lightGray300Hex) : textFill,
                        backgroundFill: hovered ? sectorBg : textBg,
                        backgroundStroke: new Stroke({
                            color: `rgba(${ textFillRaw }, ${ transparent ? 0 : booking ? 0.1 : 0.2 })`,
                            width: 1,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }),
                        declutterMode: 'declutter',
                    })
                    : undefined,
                zIndex: !label ? 1 : !hovered ? 3 : 5,
            }));
        }
        else {
            let fillOpacity = hovered ? 0.2 : booking ? 0.1 : (userColorTransparency ?? 0.07);
            let strokeOpacity = (hovered || booking) ? 0.6 : 0.5;

            if (transparent) {
                fillOpacity = 0;
                strokeOpacity = 0;
            }

            cachedStyle.push(new Style({
                fill: label
                    ? new Fill({
                        color: booking
                            ? `rgba(${ userColorRaw || getCurrentThemeRgbColor(color).join(',') }, ${ fillOpacity })`
                            : (`rgba(${ userColorRaw || getCurrentThemeRgbColor(color).join(',') }, ${ fillOpacity })`),
                    })
                    : undefined,
                stroke: new Stroke({
                    color: `rgba(${ userColorRaw || getCurrentThemeRgbColor(color).join(',') }, ${ strokeOpacity })`,
                    width: 1,
                    lineDash: dashed ? [8, 5] : undefined,
                    lineJoin: 'round',
                }),
                zIndex: !label ? 1 : !hovered ? 3 : 5,
            }));
        }

        if (!labelType && !label && useStore().localSettings.filters?.layers?.layer === 'basic') {
            cachedStyle[0].getStroke()?.setColor(`rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`);
        }

        styleCache[key] = cachedStyle;
    }

    if (label && labelType && Array.isArray(cachedStyle)) {
        const key = JSON.stringify(labelCoordinate);
        geometryCache[key] ??= new Point(labelCoordinate);

        cachedStyle[0].getText()!.setText(secondLine ? `${ label }\n${ secondLine }` : label);
        cachedStyle[0].setGeometry(geometryCache[key]);
    }

    return cachedStyle;
}

const vatglassesStyle = ({ colour, max, positionId }: FeatureAirportSectorVGProperties, transparent: boolean): Style => {
    let rgba: string;

    try {
        rgba = hexToRgb(colour);
    }
    catch {
        rgba = getSelectedColorFromSettings('firs', true) || getCurrentThemeRgbColor('success500').join(',');
    }

    const key = `vatglasses-${ String(!!positionId) }-${ String(transparent) }`;

    if (!styleCache[key]) {
        styleCache[key] = new Style({
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
            fill: getCachedFill(`rgba(${ rgba }, 0.2)`),
            stroke: new Stroke({
                color: `rgba(${ rgba }, 0.6)`,
                width: 1,
            }),
        });
    }

    if (positionId) {
        (styleCache[key] as Style).getText()!.setFill(getCachedFill(`rgba(${ rgba }, ${ transparent ? 0 : 1 })`));
        (styleCache[key] as Style).getText()!.setText(positionId);
    }

    (styleCache[key] as Style).getFill()!.setColor(`rgba(${ rgba }, ${ transparent ? 0 : 0.2 })`);
    (styleCache[key] as Style).getStroke()!.setColor(`rgba(${ rgba }, ${ transparent ? 0 : 0.6 })`);

    return styleCache[key] as Style;
};

export function setSectorStyle(layer: VectorLayer | VectorImageLayer, labelType = false) {
    styleFillCache = {};
    styleCache = {};
    geometryCache = {};

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        const hideOnZoom = useMapStore().preciseZoom > 14;

        if (isMapFeature('sector', properties)) {
            return buildFirStyle({
                color: properties.sectorType === 'empty' ? 'mapSectorBorder' : properties.sectorType === 'fir' ? 'green700' : 'purple600',
                settingsColor: properties.sectorType === 'empty' ? undefined : properties.sectorType === 'fir' ? 'firs' : 'uirs',
                transparent: hideOnZoom,
                dashed: properties.duplicated,
                booking: properties.booked,
                hovered: !!properties.selected,
                label: properties.sectorType !== 'empty' ? properties.icao : undefined,
                secondLine: properties.sectorType !== 'empty' ? properties.uir : undefined,
                labelCoordinate: properties.label,
                labelType,
            });
        }

        if (!labelType && isMapFeature('sector-vatglasses', properties)) {
            return vatglassesStyle(properties, hideOnZoom);
        }
    });
}
