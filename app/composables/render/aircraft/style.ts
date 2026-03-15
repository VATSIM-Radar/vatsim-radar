import type VectorLayer from 'ol/layer/Vector';
import type VectorImageLayer from 'ol/layer/VectorImage';
import { isMapFeature } from '~/utils/map/entities';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style.js';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';
import { getColorFromSettings, hexToRgb } from '~/composables/settings/colors';
import {
    fetchAircraftIcon,
    getAircraftStatusColor, getFilteredAircraftSettings,
    getFlightRowColor,
    ownFlight,
    reColorSvg,
} from '~/composables/vatsim/pilots';
import type { UserList } from '~/utils/server/handlers/lists';
import type { AircraftIcon } from '~/utils/icons';
import type { PartialRecord } from '~/types';
import { getResolvedScale } from '~/utils/map/aircraft-scale';

const styleImageCache: Record<string, Icon> = {};
let styleCache: Record<string, Style> = {};

const fetchedIcons: PartialRecord<AircraftIcon, string | Promise<string>> = {};

function scheduleIconForFetch(icon: AircraftIcon) {
    if (typeof fetchedIcons[icon] === 'string') return fetchedIcons[icon];

    // Already scheduled
    if (fetchedIcons[icon]) return null;

    fetchedIcons[icon] = fetchAircraftIcon(icon);
    fetchedIcons[icon]
        .then(x => fetchedIcons[icon] = x)
        .catch(e => {
            console.error(e);
            delete fetchedIcons[icon];
        });

    return null;
}

const favoritesMap = computed(() => {
    const store = useStore();

    const map: Record<number, UserList> = {};

    for (const list of store.user?.lists ?? []) {
        for (const user of list.users) {
            if (user.private && !store.user?.isSup) continue;
            map[user.cid] = list;
        }
    }

    return map;
});

function getMaxRotatedHeight(width: number, height: number): number {
    return Math.sqrt((width * width) + (height * height));
}

function svgToDataURI(svg: string) {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${ encoded }`;
}

export function setAircraftStyle(layer: VectorLayer) {
    styleCache = {};
    const store = useStore();

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft', properties)) {
            let { rotation, icon, scale, status, cid, callsign, onGround, selected } = properties;
            const hovered = useMapStore().hoveredPilot === cid;

            if (hovered) status = 'hover';
            else if (selected) status = 'active';

            if (icon.icon === 'ball') rotation = 0;

            let textStyle = styleCache.aircraftText;
            if (!textStyle) {
                textStyle = new Style({
                    text: new Text({
                        text: '',
                        font: getTextFont('caption-medium'),
                        declutterMode: 'declutter',
                        textBaseline: 'middle',
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 1)`,
                        }),
                        offsetY: 0,
                    }),
                });

                styleCache.aircraftText = textStyle;
            }

            const list = favoritesMap.value[cid];

            const filter = getFilteredAircraftSettings(cid);
            let filterColor: string | undefined;
            let filterOpacity: number | undefined;

            if (filter) {
                if (typeof filter === 'number') filterOpacity = filter;
                else {
                    filterColor = getColorFromSettings(filter);
                }
            }

            const [scaledWidth,,resolvedScale] = getResolvedScale({
                width: radarIcons[icon.icon].width,
                height: radarIcons[icon.icon].height,
                onGround,
                scale,
            });

            const hideText = scaledWidth < 10 || useMapStore().renderedPilots.length > (store.mapSettings.pilotLabelLimit ?? 100);
            const offsetY = hideText ? 0 : ((getMaxRotatedHeight(radarIcons[icon.icon].width, radarIcons[icon.icon].height) * resolvedScale) / 2) + 6 + 2;
            const textValue = hideText ? undefined : callsign;
            const text = textStyle.getText()!;

            text.setText(textValue);
            text.setOffsetY(Math.ceil(offsetY));
            textStyle?.setZIndex(Number(ownFlight.value?.cid === cid));
            text.getFill()!.setColor(getAircraftStatusColor(status, cid));

            let color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.[status === 'ground' ? 'ground' : 'main'];

            if (status === 'ground' && !color) color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.main;

            const pngImage = (status === 'default' || status === 'ground') && !list;

            if (!styleCache.aircraftImage) {
                styleCache.aircraftImage = new Style();
            }

            const pngSrc = `/_ipx/w_${ Math.ceil(scaledWidth / 10) * 10 },quality_85,f_png/aircraft/${ icon.icon }${ (filterColor || (color && color.color !== 'primary500')) ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }.png`;

            let svg: string | null = null;

            if (!pngImage) svg = scheduleIconForFetch(icon.icon);

            const imageStyleKey = String(scaledWidth) + String(pngSrc) + String(!!svg);

            if (!styleImageCache[imageStyleKey]) {
                styleImageCache[imageStyleKey] = new Icon({
                    src: svg ? svgToDataURI(reColorSvg(svg, status, cid)) : pngSrc,
                    declutterMode: 'obstacle',
                    width: scaledWidth,
                    rotateWithView: true,
                });
            }

            if (pngImage || !svg) {
                styleImageCache[imageStyleKey].setSrc(pngSrc);
                styleImageCache[imageStyleKey].setRotation(rotation);
                styleImageCache[imageStyleKey].setColor(filterColor ? `rgb(${ hexToRgb(filterColor) })` : ((color && color.color !== 'primary500') ? getColorFromSettings(color) : undefined));
                styleImageCache[imageStyleKey].setOpacity(filterColor ? parseFloat(filterColor.split(',')[3]) : filterOpacity ?? (store.mapSettings.heatmapLayer ? 0 : (color?.transparency ?? 1)));
            }
            else {
                styleImageCache[imageStyleKey].setSrc(svgToDataURI(reColorSvg(svg, status, cid)));
                styleImageCache[imageStyleKey].setRotation(rotation);
                styleImageCache[imageStyleKey].setColor(null);
                styleImageCache[imageStyleKey].setOpacity(Number(!store.mapSettings.heatmapLayer));
            }

            styleCache.aircraftImage.setImage(styleImageCache[imageStyleKey]);
            return [styleCache.aircraftImage, styleCache.aircraftText];
        }
    });
}

function getAircraftDefaultTurnColor(status: MapAircraftStatus, cid: number) {
    let color = getAircraftStatusColor(status, cid);

    if (useStore().mapSettings.colors?.turnsTransparency) {
        const rgb = hexToRgb(color);

        color = `rgba(${ rgb }, ${ useStore().mapSettings.colors?.turnsTransparency })`;
    }

    return color;
}

export function setAircraftLineStyle(layer: VectorImageLayer) {
    const store = useStore();

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft-line', properties)) {
            if (properties.lineType === 'departure-straight') {
                if (!styleCache.depLine) {
                    styleCache.depLine = new Style({
                        stroke: new Stroke({
                            color: getAircraftDefaultTurnColor(properties.status, properties.cid),
                            width: 1,
                        }),
                    });
                }

                return styleCache.depLine;
            }
            if (properties.lineType === 'arrival-straight') {
                if (!styleCache.arrLine) {
                    styleCache.arrLine = new Style({
                        stroke: new Stroke({
                            color: getAircraftDefaultTurnColor(properties.status, properties.cid),
                            width: 1,
                            lineDash: [4, 8],
                        }),
                    });
                }

                return styleCache.arrLine;
            }

            if (!styleCache.defaultLineStyle) {
                let hex = typeof properties.color === 'string' ? properties.color : getFlightRowColor(properties.color);

                if (store.mapSettings.colors?.turnsTransparency) {
                    const rgb = hexToRgb(hex);

                    hex = `rgba(${ rgb }, ${ store.mapSettings.colors?.turnsTransparency })`;
                }

                const key = String(properties.color);

                styleCache[`line${ key }`] ??= new Style({
                    stroke: new Stroke({ color: hex, width: 2 }),
                });

                return styleCache[`line${ key }`];
            }
        }
    });
}
