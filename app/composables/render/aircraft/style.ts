import type VectorLayer from 'ol/layer/Vector.js';
import type VectorImageLayer from 'ol/layer/VectorImage.js';
import { isMapFeature } from '~/utils/map/entities';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style.js';
import RegularShape from 'ol/style/RegularShape.js';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';
import { getColorFromSettings, hexToRgb } from '~/composables/settings/colors';
import {
    fetchAircraftPngIcon,
    fetchAircraftSvgIcon,
    getAircraftStatusColor, getFilteredAircraftSettings,
    getFlightRowColor,
    ownFlight,
    reColorSvg,
} from '~/composables/vatsim/pilots';
import type { UserList } from '~/utils/server/handlers/lists';
import type { AircraftIcon } from '~/utils/icons';
import type { PartialRecord } from '~/types';
import { getResolvedScale } from '~/utils/map/aircraft-scale';
import type { WatchHandle } from 'vue';
import { globalComputed } from '~/composables';

let styleImageCache: Record<string, Icon> = {};
let hitboxImageCache: Record<string, RegularShape> = {};
let styleCache: Record<string, Style> = {};

let fetchedIcons: PartialRecord<AircraftIcon, string | Promise<string>> = {};
let fetchedPngIcons: PartialRecord<string, HTMLImageElement | Promise<HTMLImageElement>> = {};
let refreshAircraftStyle: (() => void) | undefined;

function scheduleIconForFetch(icon: AircraftIcon) {
    if (typeof fetchedIcons[icon] === 'string') return fetchedIcons[icon];

    // Already scheduled
    if (fetchedIcons[icon]) return null;

    fetchedIcons[icon] = fetchAircraftSvgIcon(icon);
    fetchedIcons[icon]
        .then(x => {
            fetchedIcons[icon] = x;
            refreshAircraftStyle?.();
        })
        .catch(e => {
            console.error(e);
            delete fetchedIcons[icon];
        });

    return null;
}

function schedulePngIconForFetch(src: string) {
    // Already scheduled
    if (fetchedPngIcons[src] && 'then' in fetchedPngIcons[src]) return null;
    if (fetchedPngIcons[src]) return fetchedPngIcons[src];

    fetchedPngIcons[src] = fetchAircraftPngIcon(src);
    fetchedPngIcons[src]
        .then(x => {
            fetchedPngIcons[src] = x;
            refreshAircraftStyle?.();
        })
        .catch(e => {
            console.error(e);
            delete fetchedPngIcons[src];
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

function getColorAlpha(color: string) {
    if (!color.startsWith('rgba')) return undefined;
    return parseFloat(color.split(',')[3]);
}

function getAircraftHitboxStyle(size: number) {
    const hitboxSize = Math.ceil(size);
    const key = `aircraftHitbox${ hitboxSize }`;

    if (!hitboxImageCache[key]) {
        hitboxImageCache[key] = new RegularShape({
            points: 4,
            radius: hitboxSize / Math.SQRT2,
            angle: Math.PI / 4,
            fill: new Fill({
                color: 'rgba(0, 0, 0, 0)',
            }),
        });
    }

    if (!styleCache.aircraftHitbox) {
        styleCache.aircraftHitbox = new Style();
    }

    styleCache.aircraftHitbox.setImage(hitboxImageCache[key]);

    return styleCache.aircraftHitbox;
}

function getAircraftPngWidth(renderedWidth: number) {
    const pixelRatio = typeof globalThis.devicePixelRatio === 'number' ? Math.min(Math.ceil(globalThis.devicePixelRatio), 3) : 1;

    return Math.ceil((renderedWidth * pixelRatio) / 10) * 10;
}

let watcher: WatchHandle | undefined = undefined;

export const aircraftOverlays = globalComputed(() => useMapStore().overlays.filter(x => x.type === 'pilot').map(x => +x.key));

export function setAircraftStyle(layer: VectorLayer) {
    styleCache = {};
    hitboxImageCache = {};
    const store = useStore();
    const mapStore = useMapStore();
    refreshAircraftStyle = () => layer.changed();

    const airports = computed(() => Object.fromEntries(store.activeDashboard?.airports.filter(x => x.aircraftColor).map(x => [x.icao, x.aircraftColor]) ?? []));

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft', properties)) {
            let { rotation, icon, scale, status, cid, callsign, onGround, selected } = properties;
            const hovered = mapStore.hoveredPilot === cid;

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
                            color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 1)`,
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

            const [scaledWidth, scaledHeight, resolvedScale] = getResolvedScale({
                width: radarIcons[icon.icon].width,
                height: radarIcons[icon.icon].height,
                onGround,
                scale,
            });
            const aircraft = useDataStore().vatsim.data.keyedPilots.value[cid];
            const pilotLabels = getKeyedValueFromSettings('map.visibility.pilotLabels');
            const aircraftShowLimit = getKeyedValueFromSettings('map.preferences.aircraft.showLimit');
            const heatmap = getKeyedValueFromSettings('map.layers.heatmap');

            const hideText = !aircraftOverlays().value.includes(cid) && ownFlight.value?.cid !== cid &&
                (!pilotLabels || scaledWidth < 10 || !mapStore.renderedPilots || mapStore.renderedPilots.length === 0 || mapStore.renderedPilots.length > aircraftShowLimit);
            const offsetY = hideText ? 0 : ((getMaxRotatedHeight(radarIcons[icon.icon].width, radarIcons[icon.icon].height) * resolvedScale) / 2) + 6 + 2;
            const textValue = hideText ? undefined : callsign;
            const text = textStyle.getText()!;

            text.setText(textValue);
            text.setOffsetY(Math.ceil(offsetY));
            textStyle?.setZIndex(Number(ownFlight.value?.cid === cid));
            text.getFill()!.setColor(getAircraftStatusColor(status, cid));

            let color = getColorByKey(status === 'ground'
                ? 'map.preferences.colors.default.aircraft.ground'
                : 'map.preferences.colors.default.aircraft.main').value.value;

            if (status === 'ground' && !color) color = getColorByKey('map.preferences.colors.default.aircraft.main').value.value;

            const pngImage = !list;

            if (!styleCache.aircraftImage) {
                styleCache.aircraftImage = new Style();
            }

            const airportColor = airports.value[aircraft?.arrival ?? ''] && (status === 'default' || status === 'ground') && !list;
            const useStatusColor = status !== 'default' && status !== 'ground';
            const shouldTintPngIcon = filterColor || useStatusColor || !pngImage || airportColor || (color && color.color !== 'blue500');
            const suffix = `${ shouldTintPngIcon ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }`;
            const pngSrc = `/_ipx/w_${ getAircraftPngWidth(scaledWidth) },quality_85,f_png/aircraft/${ icon.icon }${ suffix }.png`;

            let svg: string | null = null;
            let png: HTMLImageElement | null = null;

            if (!pngImage) svg = scheduleIconForFetch(icon.icon);
            else png = schedulePngIconForFetch(pngSrc);
            const declutter = getKeyedValueFromSettings('map.traffic.declutter');
            const shouldDeclutter = declutter === 'always'
                ? true
                : declutter ? (mapStore.renderedPilots && mapStore.renderedPilots.length > aircraftShowLimit) : false;

            const pngItem = png ?? `/aircraft/${ icon.icon }${ suffix }.png`;
            const svgColor = svg || !pngImage || useStatusColor ? getAircraftStatusColor(status, cid) : undefined;
            const statusIconColor = svgColor ? `rgb(${ hexToRgb(svgColor) })` : undefined;
            const statusIconOpacity = svgColor ? getColorAlpha(svgColor) ?? 1 : undefined;
            const useSvgFallback = !pngImage && !svg;
            let iconColor: string | undefined;
            let iconOpacity: number | undefined;

            if (useSvgFallback || useStatusColor) {
                iconColor = statusIconColor;
                iconOpacity = heatmap ? 0 : statusIconOpacity;
            }
            else {
                iconColor = filterColor ? `rgb(${ hexToRgb(filterColor) })` : ((color && color.color !== 'blue500') ? getColorFromSettings(color) : undefined);
                iconOpacity = filterColor ? getColorAlpha(filterColor) : filterOpacity ?? (heatmap ? 0 : (color?.transparency ?? 1));

                if (airportColor) {
                    iconColor = getAircraftStatusColor('default', cid);
                }
            }

            const svgSrc = svg ? svgToDataURI(reColorSvg(svg, status, cid)) : undefined;
            const imageStyleKey = [
                svgSrc ? 'svg' : 'png',
                icon.icon,
                scaledWidth,
                scaledHeight,
                shouldDeclutter,
                svgSrc ? store.theme : undefined,
                svgSrc ? svgColor : pngSrc,
                svgSrc ? Number(!heatmap) : iconColor,
                svgSrc ? undefined : iconOpacity,
                svgSrc ? undefined : !!png,
            ].join('|');

            if (!styleImageCache[imageStyleKey]) {
                styleImageCache[imageStyleKey] = new Icon({
                    src: svgSrc ?? (typeof pngItem === 'string' ? pngItem : undefined),
                    img: svgSrc ? undefined : png ?? undefined,
                    declutterMode: shouldDeclutter ? 'declutter' : 'obstacle',
                    width: scaledWidth,
                    height: scaledHeight,
                    color: svgSrc ? undefined : iconColor,
                    opacity: svgSrc ? Number(!heatmap) : iconOpacity,
                    rotateWithView: true,
                });
            }

            styleImageCache[imageStyleKey].setRotation(rotation);

            styleCache.aircraftImage.setImage(styleImageCache[imageStyleKey]);
            return [getAircraftHitboxStyle(Math.max(scaledWidth, scaledHeight)), styleCache.aircraftImage, styleCache.aircraftText];
        }
    });

    watcher?.();

    watcher = watch(() => mapStore.renderedPilots?.length, val => {
        // Zoomed in, we can clean some stuff
        if (val && Object.values(fetchedPngIcons).length > val) {
            if (useIsDebug()) console.log(Object.values(fetchedPngIcons).length, Object.values(styleImageCache).length, 'aircraft cleanup');
            styleImageCache = {};
            hitboxImageCache = {};
            fetchedIcons = {};
            fetchedPngIcons = {};
        }
    });
}

function getAircraftDefaultTurnColor(status: MapAircraftStatus, cid: number) {
    let color = getAircraftStatusColor(status, cid);
    const turnsTransparency = getKeyedValueFromSettings('map.preferences.colors.turnsTransparency');

    if (turnsTransparency) {
        const rgb = hexToRgb(color);

        color = `rgba(${ rgb }, ${ turnsTransparency })`;
    }

    return color;
}

export function disposeAircraftStyle() {
    watcher?.();
    watcher = undefined;
    refreshAircraftStyle = undefined;
}

export function setAircraftLineStyle(layer: VectorImageLayer) {
    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft-line', properties)) {
            if (properties.lineType === 'departure-straight' || properties.lineType === 'arrival-straight') {
                const color = getAircraftDefaultTurnColor(properties.status, properties.cid);
                const key = `defaultLine${ color }`;

                if (!styleCache[key]) {
                    styleCache[key] = new Style({
                        stroke: new Stroke({
                            color: getAircraftDefaultTurnColor(properties.status, properties.cid),
                            width: 1,
                        }),
                    });
                }

                return styleCache[key];
            }

            if (!styleCache.defaultLineStyle) {
                let hex = typeof properties.color === 'string' ? properties.color : getFlightRowColor(properties.color);

                const turnsTransparency = getKeyedValueFromSettings('map.preferences.colors.turnsTransparency');
                if (turnsTransparency) {
                    const rgb = hexToRgb(hex);

                    hex = `rgba(${ rgb }, ${ turnsTransparency })`;
                }

                styleCache[`line${ hex }`] ??= new Style({
                    stroke: new Stroke({ color: hex, width: 2 }),
                });

                return styleCache[`line${ hex }`];
            }
        }
    });
}
