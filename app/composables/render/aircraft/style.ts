import type VectorLayer from 'ol/layer/Vector.js';
import type VectorImageLayer from 'ol/layer/VectorImage.js';
import { isMapFeature } from '~/utils/map/entities';
import type { FeatureAircraft } from '~/utils/map/entities';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style.js';
import RegularShape from 'ol/style/RegularShape.js';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';
import { getColorFromSettings, hexToRgb } from '~/composables/settings/colors';
import {
    fetchAircraftPngIcon,
    fetchAircraftSvgIcon,
    getAircraftStatusColor,
    getFlightRowColor,
    ownFlight,
    reColorSvg,
} from '~/composables/vatsim/pilots';
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import type { AircraftIcon } from '~/utils/icons';
import type { PartialRecord } from '~/types';
import { getResolvedScale } from '~/utils/map/aircraft-scale';
import { globalComputed } from '~/composables';
import { getColorValueByKey, useSettingValueFromFunc } from '~/composables/settings/v2/utils.ts';
import { favoritesMap } from '~/composables/fetchers/lists.ts';

const MAX_FETCHED_PNG_ICONS = 256;

let aircraftImageStyleCache = new Map<number, { key: string; image: Icon; pngSrc?: string }>();
let hitboxImageCache: Record<string, RegularShape> = {};
let styleCache: Record<string, Style> = {};
let svgSrcCache = new Map<number, { key: string; src: string }>();
let aircraftStyleCids = new Set<number>();

const fetchedIcons: PartialRecord<AircraftIcon, string | Promise<string>> = {};
const fetchedPngIcons = new Map<string, HTMLImageElement | Promise<HTMLImageElement>>();
let refreshAircraftStyle: (() => void) | undefined;
let refreshAircraftStyleFrame: number | null = null;
function scheduleAircraftStyleRefresh() {
    if (!refreshAircraftStyle || refreshAircraftStyleFrame !== null) return;

    refreshAircraftStyleFrame = requestAnimationFrame(() => {
        refreshAircraftStyleFrame = null;
        refreshAircraftStyle?.();
    });
}

function trimFetchedPngIcons() {
    if (fetchedPngIcons.size <= MAX_FETCHED_PNG_ICONS) return;
    const activeSources = new Set(Array.from(aircraftImageStyleCache.values())
        .map(x => x.pngSrc)
        .filter((src): src is string => src !== undefined));

    for (const [src, value] of fetchedPngIcons) {
        if (fetchedPngIcons.size <= MAX_FETCHED_PNG_ICONS) break;
        if ('then' in value || activeSources.has(src)) continue;
        fetchedPngIcons.delete(src);
    }
}

function scheduleIconForFetch(icon: AircraftIcon) {
    if (typeof fetchedIcons[icon] === 'string') return fetchedIcons[icon];

    // Already scheduled
    if (fetchedIcons[icon]) return null;

    fetchedIcons[icon] = fetchAircraftSvgIcon(icon);
    fetchedIcons[icon]
        .then(x => {
            fetchedIcons[icon] = x;
            scheduleAircraftStyleRefresh();
        })
        .catch(e => {
            console.error(e);
            delete fetchedIcons[icon];
        });

    return null;
}

function schedulePngIconForFetch(src: string) {
    const cached = fetchedPngIcons.get(src);

    // Already scheduled
    if (cached && 'then' in cached) return null;
    if (cached) {
        // Keep recently used decoded images at the end of the bounded cache.
        fetchedPngIcons.delete(src);
        fetchedPngIcons.set(src, cached);
        return cached;
    }

    const request = fetchAircraftPngIcon(src);
    fetchedPngIcons.set(src, request);
    request
        .then(x => {
            if (fetchedPngIcons.get(src) !== request) return;
            fetchedPngIcons.delete(src);
            fetchedPngIcons.set(src, x);
            trimFetchedPngIcons();
            scheduleAircraftStyleRefresh();
        })
        .catch(e => {
            console.error(e);
            if (fetchedPngIcons.get(src) === request) fetchedPngIcons.delete(src);
        });

    return null;
}

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
    const cached = svgSrcCache.get(cid);
    if (cached?.key === key) return cached.src;

    const src = svgToDataURI(reColorSvg(svg, status, cid, color));
    svgSrcCache.set(cid, { key, src });
    return src;
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
    const pixelRatio = getAircraftPixelRatio();

    return Math.ceil((renderedWidth * pixelRatio) / 10) * 10;
}

function getAircraftPixelRatio() {
    return typeof globalThis.devicePixelRatio === 'number' ? Math.min(Math.ceil(globalThis.devicePixelRatio), 3) : 1;
}

export function isPilotOverlayParked(overlay: { minified: boolean; sticky: boolean }): boolean {
    // return useStore().isMobile && overlay.minified && !overlay.sticky;
    return false;
}

export const aircraftOverlays = globalComputed(() => useMapStore().overlays.filter(x => x.type === 'pilot' && !isPilotOverlayParked(x)).map(x => +x.key));

export function resetAircraftStyleCache(layer: VectorLayer) {
    for (const feature of layer.getSource()?.getFeatures() ?? []) {
        feature.set('styleCacheKey', undefined, true);
    }
    layer.changed();
}

export function setAircraftStyle(layer: VectorLayer) {
    styleCache = {};
    hitboxImageCache = {};
    aircraftImageStyleCache = new Map();
    svgSrcCache = new Map();
    aircraftStyleCids = new Set();
    const store = useStore();
    const mapStore = useMapStore();
    refreshAircraftStyle = () => resetAircraftStyleCache(layer);

    const airports = computed(() => Object.fromEntries(store.activeDashboard?.airports.filter(x => x.aircraftColor).map(x => [x.icao, x.aircraftColor]) ?? []));

    const pilotLabels = useSettingValueFromFunc('map.visibility.pilotLabels');
    const aircraftShowLimit = useSettingValueFromFunc('map.preferences.aircraft.showLimit');
    const heatmap = useSettingValueFromFunc('map.layers.heatmap');
    const overlays = aircraftOverlays();
    const favorites = favoritesMap();

    layer.setStyle(feature => {
        const properties = feature.getProperties();
        if (isMapFeature('aircraft', properties)) {
            let { rotation, icon, scale, status, cid, callsign, onGround, selected, departure, arrival, filteredStyle } = properties;
            const hovered = mapStore.hoveredPilot === cid;

            if (hovered) {
                status = 'hover';
            }
            else if (selected) {
                status = 'active';
            }

            if (icon.icon === 'ball') rotation = 0;

            const aircraftKey = String(properties.cid);
            const styleKey = `aircraft-${ aircraftKey }`;
            const textKey = `${ styleKey }-text`;
            const hitboxKey = `${ styleKey }-hitbox`;
            aircraftStyleCids.add(cid);

            const filteredColor = filteredStyle && typeof filteredStyle === 'object' ? filteredStyle.color : undefined;
            const filteredTransparency = filteredStyle && typeof filteredStyle === 'object' ? filteredStyle.transparency : undefined;
            const filteredOpacity = typeof filteredStyle === 'number' ? filteredStyle : undefined;
            const styleCacheKey = [
                status,
                icon.icon,
                scale,
                callsign,
                Number(onGround),
                departure,
                arrival,
                filteredColor,
                filteredTransparency,
                filteredOpacity,
                getAircraftPixelRatio(),
            ].join('|');
            const cachedImageStyle = styleCache[styleKey];

            if (cachedImageStyle && rotation !== cachedImageStyle.getImage()?.getRotation()) {
                cachedImageStyle.getImage()?.setRotation(rotation);
            }

            if (mapStore.moving) {
                if (!styleCache[styleKey]) return undefined;

                if (!styleCache[textKey] || (mapStore.renderedPilots && mapStore.getRenderedPilotsCount > aircraftShowLimit.value)) {
                    return styleCache[styleKey];
                }

                return [styleCache[styleKey], styleCache[textKey]];
            }

            if (properties.styleCacheKey === styleCacheKey && cachedImageStyle) {
                if (mapStore.renderedPilots && mapStore.getRenderedPilotsCount > aircraftShowLimit.value) return cachedImageStyle;
                if (styleCache[hitboxKey] && styleCache[textKey]) return [styleCache[hitboxKey], cachedImageStyle, styleCache[textKey]];
            }

            const aircraftColor = getAircraftStatusColor(status, cid);

            let color = getColorValueByKey(status === 'ground'
                ? 'map.preferences.colors.default.aircraft.ground'
                : 'map.preferences.colors.default.aircraft.main');

            if (status === 'ground' && !color) color = getColorValueByKey('map.preferences.colors.default.aircraft.main');

            const list = favorites.value[cid];

            let filterColor: string | undefined;
            let filterOpacity: number | undefined;

            if (filteredStyle) {
                if (typeof filteredStyle === 'number') filterOpacity = filteredStyle;
                else {
                    filterColor = getColorFromSettings(filteredStyle);
                }
            }

            const [scaledWidth, scaledHeight, resolvedScale] = getResolvedScale({
                width: radarIcons[icon.icon].width,
                height: radarIcons[icon.icon].height,
                onGround,
                scale,
            });
            const pngImage = (status === 'default' || status === 'ground') && !list;

            if (!styleCache[styleKey]) {
                styleCache[styleKey] = new Style();
            }

            const airportColor = airports.value[arrival ?? ''] && (status === 'default' || status === 'ground') && !list;
            const shouldTintPngIcon = filterColor || !pngImage || airportColor || (color && color.color !== 'blue500');
            const suffix = `${ shouldTintPngIcon ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }`;
            const pngSrc = `/_ipx/w_${ getAircraftPngWidth(scaledWidth) },quality_85,f_webp/aircraft/${ icon.icon }${ suffix }.png`;

            let svg: string | null = null;
            let png: HTMLImageElement | null = null;

            if (!pngImage) svg = scheduleIconForFetch(icon.icon);
            else png = schedulePngIconForFetch(pngSrc);
            const declutter = getKeyedValueFromSettings('map.traffic.declutter');
            const shouldDeclutter = declutter === 'always'
                ? true
                : declutter ? (mapStore.renderedPilots && mapStore.getRenderedPilotsCount > aircraftShowLimit.value) : false;

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
                aircraftColor,
                svgSrc ? Number(!heatmap.value) : iconColor,
                svgSrc ? undefined : iconOpacity,
                svgSrc ? undefined : !!png,
            ].join('|');

            let cachedAircraftImage = aircraftImageStyleCache.get(cid);
            if (!cachedAircraftImage || cachedAircraftImage.key !== imageStyleKey) {
                cachedAircraftImage = {
                    key: imageStyleKey,
                    pngSrc: pngImage ? pngSrc : undefined,
                    image: new Icon({
                        src: svgSrc ?? (typeof pngItem === 'string' ? pngItem : undefined),
                        img: svgSrc ? undefined : png ?? undefined,
                        declutterMode: shouldDeclutter ? 'declutter' : 'obstacle',
                        width: scaledWidth,
                        height: scaledHeight,
                        color: svgSrc ? undefined : iconColor,
                        opacity: svgSrc ? Number(!heatmap.value) : iconOpacity,
                        rotateWithView: true,
                    }),
                };
                aircraftImageStyleCache.set(cid, cachedAircraftImage);
            }
            const imageStyle = cachedAircraftImage.image;

            if (rotation !== imageStyle.getRotation()) {
                imageStyle.setRotation(rotation);
            }

            if (styleCache[styleKey].getImage() !== imageStyle) {
                styleCache[styleKey].setImage(imageStyle);
            }

            if (mapStore.renderedPilots && mapStore.getRenderedPilotsCount > aircraftShowLimit.value) {
                (feature as FeatureAircraft).set('styleCacheKey', styleCacheKey, true);
                return styleCache[styleKey];
            }

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

            const hideText = !overlays.value.includes(cid) && ownFlight.value?.cid !== cid &&
                (!pilotLabels.value || scaledWidth < 10 || !mapStore.renderedPilots || mapStore.getRenderedPilotsCount === 0 || mapStore.renderedPilots.length > aircraftShowLimit.value);
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

            styleCache[hitboxKey] = getAircraftHitboxStyle(Math.max(scaledWidth, scaledHeight));
            (feature as FeatureAircraft).set('styleCacheKey', styleCacheKey, true);
            return [styleCache[hitboxKey], styleCache[styleKey], styleCache[textKey]];
        }
    });
}

export function pruneAircraftStyleCache(activeCids: ReadonlySet<number>) {
    for (const cid of aircraftStyleCids) {
        if (activeCids.has(cid)) continue;

        delete styleCache[`aircraft-${ cid }`];
        delete styleCache[`aircraft-${ cid }-text`];
        delete styleCache[`aircraft-${ cid }-hitbox`];
        aircraftImageStyleCache.delete(cid);
        svgSrcCache.delete(cid);
        aircraftStyleCids.delete(cid);
    }

    trimFetchedPngIcons();
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
    if (refreshAircraftStyleFrame !== null) cancelAnimationFrame(refreshAircraftStyleFrame);
    refreshAircraftStyleFrame = null;
    refreshAircraftStyle = undefined;
    aircraftImageStyleCache.clear();
    svgSrcCache.clear();
    aircraftStyleCids.clear();
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
