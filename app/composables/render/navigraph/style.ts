import { isMapFeature } from '~/utils/map/entities';
import { Icon, Style, Fill, Stroke, Text } from 'ol/style.js';
import { getCurrentThemeRgbColor } from '~/composables';
import { Point } from 'ol/geom.js';
import type { Geometry } from 'ol/geom.js';
import type VectorImageLayer from 'ol/layer/VectorImage';
import { getTextFont } from '~/composables/render/text';
import type VectorLayer from 'ol/layer/Vector';

const ndbStyle = new Icon({
    src: '/icons/compressed/ndb.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const vordmeStyle = new Icon({
    src: '/icons/compressed/vordme.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const ndbStyleSmall = new Icon({
    src: '/icons/compressed/ndb.png',
    width: 12,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const vordmeStyleSmall = new Icon({
    src: '/icons/compressed/vordme.png',
    width: 12,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const showAirwaysLabels = computed(() => useStore().mapSettings.navigraphData?.airways?.showAirwaysLabel !== false);
const showWaypointsLabels = computed(() => useStore().mapSettings.navigraphData?.airways?.showWaypointsLabel !== false);

const waypointsTypes = {
    default: new Style({
        image: new Icon({
            src: '/icons/compressed/compulsory-rep.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.6,
        }),
        zIndex: 6,
    }),
    flyOver: new Style({
        image: new Icon({
            src: '/icons/compressed/fly-over.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.8,
        }),
        zIndex: 6,
    }),
    flyBy: new Style({
        image: new Icon({
            src: '/icons/compressed/fly-by.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.8,
        }),
        zIndex: 6,
    }),
    onRequest: new Style({
        image: new Icon({
            src: '/icons/compressed/on-request.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.6,
        }),
        zIndex: 6,
    }),
    compulsoryFlyBy: new Style({
        image: new Icon({
            src: '/icons/compressed/compulsory-fly-by.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.6,
        }),
        zIndex: 6,
    }),
    approachFix: new Style({
        image: new Icon({
            src: '/icons/compressed/final-approach-fix.png',
            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
            width: 8,
            opacity: 0.6,
        }),
        zIndex: 6,
    }),
};

const waypointStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.1)`,
    width: 2,
});

const holdingStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.1)`,
    width: 2,
});

const waypointBlueStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.1)`,
    width: 2,
});

const enrouteStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('primary500').join(',') }, 0.5)`,
    width: 4,
});

const enrouteSidStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('info500').join(',') }, 0.5)`,
    width: 4,
});

const sidStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('info500').join(',') }, 0.5)`,
    width: 5,
});

const enrouteStarStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('success400').join(',') }, 0.5)`,
    width: 4,
});

const starStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('success400').join(',') }, 0.5)`,
    width: 5,
});

const enrouteApproachStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
    width: 4,
});

const approachStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
    width: 5,
});

const missApproachStroke = new Stroke({
    color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
    width: 3,
    lineJoin: 'round',
    lineDash: [6, 12],
});

const strokesCache = {
    self: {} as Record<string, Stroke>,
    currentFlight: {} as Record<string, Stroke>,
};

const westTrack = new Style({
    zIndex: 5,
    text: new Text({
        font: '15px LibreFranklin',
        text: `←`,
        placement: 'line',
        keepUpright: true,
        justify: 'center',
        declutterMode: 'none',
        rotateWithView: false,
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('lightGray200').join(',') }, 0.7)`,
        }),
    }),
});

const eastTrack = new Style({
    zIndex: 5,
    text: new Text({
        font: '15px LibreFranklin',
        text: `→`,
        placement: 'line',
        keepUpright: true,
        justify: 'center',
        declutterMode: 'none',
        rotateWithView: false,
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('lightGray200').join(',') }, 0.7)`,
        }),
    }),
});

let styleCache: Record<string, Style> = {};
let stylesCache: Record<string, Style[]> = {};
const geometriesCache = new WeakMap<WeakKey, Geometry>();

export function setNavigraphStyle(layer: VectorImageLayer | VectorLayer) {
    styleCache = {};
    stylesCache = {};

    layer.setStyle(feature => {
        const properties = feature.getProperties();

        if (!isMapFeature('navigraph', properties)) return;

        const featureType = properties.featureType;
        const isEnroute = featureType.startsWith('enroute') || featureType.startsWith('procedure');

        if (featureType.endsWith('ndb') || featureType.endsWith('vhf')) {
            const text = featureType.endsWith('ndb')
                ? !isEnroute && properties.name ? `${ properties.name }\nNDB ${ properties.frequency } ${ properties.ident }` : properties.identifier
                : !isEnroute && properties.name ? `${ properties.name }\nVORDME ${ properties.frequency } ${ properties.ident }` : properties.identifier;

            const key = `nbdvhf-${ String(isEnroute) }-${ featureType }`;

            if (!stylesCache[key]) {
                stylesCache[key] = [
                    new Style({
                        image: featureType.endsWith('ndb') ? (isEnroute ? ndbStyleSmall : ndbStyle) : (isEnroute ? vordmeStyleSmall : vordmeStyle),
                        zIndex: 7,
                    }),
                    new Style({
                        text: new Text({
                            font: getTextFont('caption-light', { fontSize: 8 }),
                            text,
                            offsetX: 15,
                            offsetY: 2,
                            textAlign: 'left',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                            }),
                        }),
                        zIndex: 5,
                    }),
                ];
            }

            stylesCache[key][1].getText()!.setText(text);

            if (properties.pointCoordinate) {
                if (!geometriesCache.has(properties.pointCoordinate)) {
                    geometriesCache.set(properties.pointCoordinate, new Point(properties.pointCoordinate));
                }

                stylesCache[key][1].setGeometry(geometriesCache.get(properties.pointCoordinate)!);
            }

            return stylesCache[key];
        }

        if (featureType.endsWith('waypoint')) {
            let text = `${ properties.waypoint }`;
            let zIndex = 6;

            if (properties.altitude || properties.speedLimit) {
                if (properties.altitude) {
                    text += '\n';
                    zIndex = 7;

                    switch (properties.altitude) {
                        case 'between':
                            text += `–${ properties.altitude1 } / +${ properties.altitude2 }`;
                            break;
                        case 'equals':
                            text += `${ properties.altitude1 }`;
                            break;
                        case 'above':
                            text += `+${ properties.altitude1 }`;
                            break;
                        case 'below':
                            text += `-${ properties.altitude1 }`;
                            break;
                    }
                }

                if (properties.speed) {
                    text += '\n';
                    zIndex = 7;

                    switch (properties.speed) {
                        case 'equals':
                            text += `AT ${ properties.speedLimit } KT`;
                            break;
                        case 'above':
                            text += `MIN ${ properties.speedLimit } KT`;
                            break;
                        case 'below':
                            text += `MAX ${ properties.speedLimit } KT`;
                            break;
                    }
                }
            }

            let image = waypointsTypes.default;

            if (properties.usage) {
                if (properties.usage[0] === 'W' && properties.usage[2]?.trim()) {
                    image = waypointsTypes.compulsoryFlyBy;
                }
                else if (properties.usage[0] === 'W') {
                    image = waypointsTypes.flyBy;
                }
                else if (properties.usage[0] === 'R') {
                    image = waypointsTypes.onRequest;
                }
            }

            if (properties.description) {
                if (properties.description[0] === 'R') {
                    image = waypointsTypes.onRequest;
                }

                if (properties.description[1] === 'Y') {
                    image = waypointsTypes.flyOver;
                }

                if (properties.description[2] === 'C' || properties.description[0] === 'V') {
                    image = waypointsTypes.compulsoryFlyBy;
                }

                if (properties.description[3] === 'E' || properties.description[3] === 'F') {
                    image = waypointsTypes.approachFix;
                }
            }

            if (!styleCache.waypoint) {
                styleCache.waypoint = new Style({
                    text: new Text({
                        font: getTextFont('caption', { fontSize: 8 }),
                        text,
                        offsetX: 12,
                        textBaseline: 'middle',
                        textAlign: 'left',
                        justify: 'left',
                        padding: [2, 2, 2, 2],
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                        }),
                    }),
                    zIndex,
                });
            }

            if (properties.pointCoordinate) {
                if (!geometriesCache.has(properties.pointCoordinate)) {
                    geometriesCache.set(properties.pointCoordinate, new Point(properties.pointCoordinate));
                }

                styleCache.waypoint.setGeometry(geometriesCache.get(properties.pointCoordinate)!);
            }
            else {
                styleCache.waypoint.setGeometry(null);
            }

            const styles = [
                image,
            ];

            if (showWaypointsLabels.value || featureType === 'waypoint') {
                styleCache.waypoint.getText()!.setText(text);
                styles.push(styleCache.waypoint);
            }

            return styles;
        }

        if (featureType.endsWith('airways')) {
            let stroke = properties.flightLevel === 'L' ? waypointStroke : waypointBlueStroke;

            if (properties.kind) {
                stroke = enrouteStroke;
                if (properties.kind === 'sids') stroke = enrouteSidStroke;
                if (properties.kind === 'stars') stroke = enrouteStarStroke;
                if (properties.kind === 'approaches') stroke = enrouteApproachStroke;
                if (properties.kind === 'missedApproach') stroke = missApproachStroke;

                let selfSuffix = '';
                const kind = properties.kind ?? 'default';

                if (properties.self) {
                    strokesCache.self[kind] ||= new Stroke({
                        color: stroke.getColor(),
                        width: stroke.getWidth(),
                        lineDash: [4, 8],
                        lineJoin: 'round',
                    });

                    stroke = strokesCache.self[kind];

                    properties.kind = 'self';
                    selfSuffix = 'self';
                }

                if (properties.currentFlight) {
                    strokesCache.currentFlight[kind + selfSuffix] ||= new Stroke({
                        color: stroke.getColor(),
                        width: stroke.getWidth()! + 2,
                        lineDash: stroke.getLineDash()!,
                        lineJoin: stroke.getLineJoin(),
                    });

                    stroke = strokesCache.currentFlight[kind + selfSuffix];
                }
            }

            const key = `airway-${ String(properties.kind) }`;

            styleCache[key] = new Style({
                stroke,
                zIndex: 5,
                text: new Text({
                    font: getTextFont('caption-medium', { fontSize: 8 }),
                    text: `${ properties.identifier }`,
                    placement: 'line',
                    keepUpright: true,
                    textBaseline: properties.kind === 'nat' ? 'bottom' : undefined,
                    offsetY: -4,
                    justify: 'center',
                    padding: [6, 6, 6, 6],
                    rotateWithView: false,
                    fill: new Fill({
                        color: properties.kind === 'nat' ? `rgba(${ getCurrentThemeRgbColor('blue500').join(',') }, 0.7)` : `rgba(${ getCurrentThemeRgbColor('blue300').join(',') }, 0.7)`,
                    }),
                }),
            });

            styleCache[key].setStroke(stroke);
            styleCache[key].getText()!.setText(showAirwaysLabels.value ? properties.identifier : undefined);

            const style = [
                styleCache[key],
            ];

            if (properties.kind === 'nat' && properties.direction) {
                style.push(properties.direction === 'west' ? westTrack : eastTrack);
            }

            return style;
        }

        if (featureType === 'holdings') {
            if (!styleCache.holdings) {
                styleCache.holdings = new Style({
                    stroke: holdingStroke,
                    zIndex: 5,
                    text: new Text({
                        font: getTextFont('caption-medium', { fontSize: 9 }),
                        text: `${ properties.course }° ${ properties.turns }`,
                        maxAngle: 0,
                        placement: 'line',
                        textBaseline: 'bottom',
                        keepUpright: true,
                        padding: [2, 2, 2, 2],
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                        }),
                    }),
                });
            }

            styleCache.holdings.getText()!.setText(`${ properties.course }° ${ properties.turns }`);

            return styleCache.holdings;
        }

        if (isEnroute) {
            if (properties.procedure === 'sid') {
                if (!styleCache.sid) {
                    styleCache.sid = new Style({
                        text: new Text({
                            font: '7px LibreFranklin',
                            text: `${ properties.name }`,
                            textBaseline: 'middle',
                            padding: [2, 2, 2, 2],
                            textAlign: 'center',
                            placement: 'line',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                            }),
                        }),
                        stroke: sidStroke,
                        zIndex: 3,
                    });
                }

                styleCache.sid.getText()!.setText(properties.name);

                return styleCache.sid;
            }

            if (properties.procedure === 'star') {
                if (!styleCache.star) {
                    styleCache.star = new Style({
                        text: new Text({
                            font: '7px LibreFranklin',
                            text: `${ properties.name }`,
                            textBaseline: 'middle',
                            padding: [2, 2, 2, 2],
                            textAlign: 'center',
                            placement: 'line',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                            }),
                        }),
                        stroke: starStroke,
                        zIndex: 3,
                    });
                }

                styleCache.star.getText()!.setText(properties.name);

                return styleCache.star;
            }

            if (properties.procedure === 'approaches') {
                if (!styleCache.approach) {
                    styleCache.approach = new Style({
                        stroke: approachStroke,
                        zIndex: 3,
                    });
                }

                return styleCache.approach;
            }

            if (properties.procedure === 'missedApproach') {
                if (!styleCache.missedApproach) {
                    styleCache.missedApproach = new Style({
                        stroke: missApproachStroke,
                        zIndex: 3,
                    });
                }

                return styleCache.missedApproach;
            }
        }
    });
}
