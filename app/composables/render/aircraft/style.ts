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
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import type { UserList } from '~/utils/server/handlers/lists';
import type { AircraftIcon } from '~/utils/icons';
import type { PartialRecord } from '~/types';
import { getResolvedScale } from '~/utils/map/aircraft-scale';
import type { WatchHandle } from 'vue';
import { globalComputed } from '~/composables';
import { getColorValueByKey, useSettingValueFromFunc } from '~/composables/settings/v2/utils.ts';

let styleImageCache: Record<string, Icon> = {};
let hitboxImageCache: Record<string, RegularShape> = {};
let styleCache: Record<string, Style> = {};
let svgSrcCache: Record<string, string> = {};

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

function getCachedAircraftSvgSrc(icon: AircraftIcon, status: MapAircraftStatus, cid: number, theme: string, color: string, svg: string) {
    const key = `${ icon }|${ status }|${ cid }|${ theme }|${ color }`;

    return svgSrcCache[key] ??= svgToDataURI(reColorSvg(svg, status, cid));
}

function getColorAlpha(color: string) {
    if (!color.startsWith('rgba')) return undefined;
    return parseFloat(color.split(',')[3]);
}

function getAircraftHitboxStyle(size: number) {
    const hitboxSize = Math.ceil(size);
    const imageKey = `aircraftHitbox${ hitboxSize }`;
    const styleKey = `aircraftHitboxStyle${ hitboxSize }`;

    if (!hitboxImageCache[imageKey]) {
        hitboxImageCache[imageKey] = new RegularShape({
            points: 4,
            radius: hitboxSize / Math.SQRT2,
            angle: Math.PI / 4,
            fill: new Fill({
                color: 'rgba(0, 0, 0, 0)',
            }),
            declutterMode: 'none',
        });
    }

    if (!styleCache[styleKey]) {
        styleCache[styleKey] = new Style({
            image: hitboxImageCache[imageKey],
        });
    }

    return styleCache[styleKey];
}

function getAircraftPngWidth(renderedWidth: number) {
    const pixelRatio = typeof globalThis.devicePixelRatio === 'number' ? Math.min(Math.ceil(globalThis.devicePixelRatio), 3) : 1;

    return Math.ceil((renderedWidth * pixelRatio) / 10) * 10;
}

let watcher: WatchHandle | undefined = undefined;

export function isPilotOverlayParked(overlay: { minified: boolean; sticky: boolean }): boolean {
    return useStore().isMobile && overlay.minified && !overlay.sticky;
}

export const aircraftOverlays = globalComputed(() => useMapStore().overlays.filter(x => x.type === 'pilot' && !isPilotOverlayParked(x)).map(x => +x.key));

export function setAircraftStyle(layer: VectorLayer) {
    styleCache = {};
    hitboxImageCache = {};
    svgSrcCache = {};
    const store = useStore();
    const mapStore = useMapStore();
    refreshAircraftStyle = () => {
        layer.changed();
    };

    const airports = computed(() => Object.fromEntries(store.activeDashboard?.airports.filter(x => x.aircraftColor).map(x => [x.icao, x.aircraftColor]) ?? []));

    const pilotLabels = useSettingValueFromFunc('map.visibility.pilotLabels');
    const aircraftShowLimit = useSettingValueFromFunc('map.preferences.aircraft.showLimit');
    const heatmap = useSettingValueFromFunc('map.layers.heatmap');
    const overlays = aircraftOverlays();

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft', properties)) {
            let { rotation, icon, scale, status, color: aircraftColor, cid, callsign, onGround, selected } = properties;
            const hovered = mapStore.hoveredPilot === cid;

            if (hovered) {
                status = 'hover';
                aircraftColor = getAircraftStatusColor('hover');
            }
            else if (selected) {
                status = 'active';
                aircraftColor = getAircraftStatusColor('active');
            }

            if (icon.icon === 'ball') rotation = 0;

            // const aircraftKey = String(properties.cid);
            const styleKey = 'aircraftStyle';
            const textKey = `${ styleKey }-text`;

            let textStyle = styleCache[textKey];
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

                styleCache[textKey] = textStyle;
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

            const hideText = !overlays.value.includes(cid) && ownFlight.value?.cid !== cid &&
                (!pilotLabels.value || scaledWidth < 10 || !mapStore.renderedPilots || mapStore.renderedPilots.length === 0 || mapStore.renderedPilots.length > aircraftShowLimit.value);
            let offsetY = hideText ? 0 : ((getMaxRotatedHeight(radarIcons[icon.icon].width, radarIcons[icon.icon].height) * resolvedScale) / 2) + 6 + 2;
            const textValue = hideText ? undefined : callsign;
            const text = textStyle.getText()!;

            if (textValue !== text.getText()) {
                text.setText(textValue);
            }

            offsetY = Math.ceil(offsetY);

            if (text.getOffsetY() !== offsetY) {
                text.setOffsetY(Math.ceil(offsetY));
            }

            const zIndex = Number(ownFlight.value?.cid === cid);
            if (textStyle.getZIndex() !== zIndex) {
                textStyle?.setZIndex(zIndex);
            }

            if (text.getFill()!.getColor() !== aircraftColor) {
                text.getFill()!.setColor(aircraftColor);
            }

            let color = getColorValueByKey(status === 'ground'
                ? 'map.preferences.colors.default.aircraft.ground'
                : 'map.preferences.colors.default.aircraft.main');

            if (status === 'ground' && !color) color = getColorValueByKey('map.preferences.colors.default.aircraft.main');

            const pngImage = (status === 'default' || status === 'ground') && !list;

            if (!styleCache[styleKey]) {
                styleCache[styleKey] = new Style();
            }

            const airportColor = airports.value[aircraft?.arrival ?? ''] && (status === 'default' || status === 'ground') && !list;
            const shouldTintPngIcon = filterColor || !pngImage || airportColor || (color && color.color !== 'blue500');
            const suffix = `${ shouldTintPngIcon ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }`;
            const pngSrc = `/_ipx/w_${ Math.ceil(getAircraftPngWidth(scaledWidth) * window.devicePixelRatio) },quality_85,f_webp/aircraft/${ icon.icon }${ suffix }.png`;

            let svg: string | null = null;
            let png: HTMLImageElement | null = null;

            if (!pngImage) svg = scheduleIconForFetch(icon.icon);
            else png = schedulePngIconForFetch(pngSrc);
            const declutter = getKeyedValueFromSettings('map.traffic.declutter');
            const shouldDeclutter = declutter === 'always'
                ? true
                : declutter ? (mapStore.renderedPilots && mapStore.renderedPilots.length > aircraftShowLimit.value) : false;

            const pngItem = png ?? `/aircraft/${ icon.icon }${ suffix }.png`;
            const svgColor = svg || !pngImage ? aircraftColor : undefined;
            const statusIconColor = svgColor ? `rgb(${ hexToRgb(svgColor) })` : undefined;
            const statusIconOpacity = svgColor ? getColorAlpha(svgColor) ?? 1 : undefined;
            const useSvgFallback = !pngImage && !svg;
            let iconColor: string | undefined;
            let iconOpacity: number | undefined;

            if (useSvgFallback) {
                iconColor = statusIconColor;
                iconOpacity = heatmap.value ? 0 : statusIconOpacity;
            }
            else {
                iconColor = filterColor ? `rgb(${ hexToRgb(filterColor) })` : ((color && color.color !== 'blue500') ? getColorFromSettings(color) : undefined);
                iconOpacity = filterColor ? getColorAlpha(filterColor) : filterOpacity ?? (heatmap.value ? 0 : (color?.transparency ?? 1));

                if (airportColor) {
                    iconColor = getAircraftStatusColor('default', cid);
                }
            }

            const svgSrc = svg ? getCachedAircraftSvgSrc(icon.icon, status, cid, store.theme, aircraftColor, svg) : undefined;
            const imageStyleKey = [
                svgSrc ? 'svg' : 'png',
                icon.icon,
                scaledWidth,
                scaledHeight,
                shouldDeclutter,
                svgSrc ? store.theme : undefined,
                svgSrc ? svgColor : pngSrc,
                svgSrc ? Number(!heatmap.value) : iconColor,
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
                    opacity: svgSrc ? Number(!heatmap.value) : iconOpacity,
                    rotateWithView: true,
                });
            }

            if (rotation !== styleImageCache[imageStyleKey].getRotation()) {
                styleImageCache[imageStyleKey].setRotation(rotation);
            }

            if (styleCache[styleKey].getImage() !== styleImageCache[imageStyleKey]) {
                styleCache[styleKey].setImage(styleImageCache[imageStyleKey]);
            }

            if (mapStore.renderedPilots && mapStore.renderedPilots.length > aircraftShowLimit.value) return styleCache[styleKey];

            return [getAircraftHitboxStyle(Math.max(scaledWidth, scaledHeight)), styleCache[styleKey], styleCache[textKey]];
        }
    });

    watcher?.();

    watcher = watch(() => mapStore.renderedPilots?.length, val => {
        // Zoomed in, we can clean some stuff
        if (val && Object.values(fetchedPngIcons).length > val) {
            if (useIsDebug()) console.log(Object.values(fetchedPngIcons).length, Object.values(styleImageCache).length, 'aircraft cleanup');
            styleCache = {};
            styleImageCache = {};
            svgSrcCache = {};
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
