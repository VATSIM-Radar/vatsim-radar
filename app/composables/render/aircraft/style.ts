import type VectorLayer from 'ol/layer/Vector';
import type VectorImageLayer from 'ol/layer/VectorImage';
import { isMapFeature } from '~/utils/map/entities';
import type { Stroke } from 'ol/style';
import { Fill, Icon, Style, Text } from 'ol/style';
import { useStore } from '~/store';
import { getUserList } from '~/composables/fetchers/lists';
import { useMapStore } from '~/store/map';
import { getColorFromSettings, hexToRgb } from '~/composables/settings/colors';
import { fetchAircraftIcon, getAircraftStatusColor, ownFlight, reColorSvg } from '~/composables/vatsim/pilots';
import type { UserList } from '~/utils/server/handlers/lists';
import type { AircraftIcon } from '~/utils/icons';
import type { PartialRecord } from '~/types';

const styleFillCache: Record<string, Fill> = {};
const styleStrokeCache: Record<string, Stroke> = {};
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

const getFilteredAircraftSettings = (cid: number) => {
    const store = useStore();
    const dataStore = useDataStore();

    if (hasActivePilotFilter() && typeof store.activeFilter.others === 'object' && (store.activeFilter.others.ourColor || typeof store.activeFilter.others.othersOpacity === 'number')) {
        const pilot = dataStore.vatsim.data.keyedPilots.value?.[cid];
        if (pilot?.filteredColor) return pilot.filteredColor;
        else return pilot?.filteredOpacity;
    }
};

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
            let { rotation, icon, scale, status, cid, onGround } = properties;
            if (icon.icon === 'ball') rotation = 0;

            let resolvedScale = typeof scale === 'number' ? scale : (store.mapSettings.aircraftScale ?? 1);

            let textStyle = styleCache.aircraftText;
            if (!textStyle) {
                textStyle = new Style({
                    text: new Text({
                        text: '',
                        font: '600 11px LibreFranklin',
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

            const image = imageStyle.getImage();

            const featureProperties = feature.getProperties() ?? {};
            const zoom = useMapStore().zoom;

            const filter = getFilteredAircraftSettings(cid);
            let filterColor: string | undefined;
            let filterOpacity: number | undefined;

            if (filter) {
                if (typeof filter === 'number') filterOpacity = filter;
                else {
                    filterColor = getColorFromSettings(filter);
                }
            }

            if (resolvedScale > 10) resolvedScale = 10;

            let scaledWidth = icon.width * resolvedScale;
            let minWidth: number = 0;

            if (zoom > 8) minWidth = 15;

            if (!onGround && scaledWidth < minWidth) {
                scaledWidth = minWidth;
                resolvedScale = scaledWidth / icon.width;
            }

            let text = textStyle.getText();

            const hideText = scaledWidth < 10 || useDataStore().visiblePilots.value.length > (store.mapSettings.pilotLabelLimit ?? 100);
            const offsetY = hideText ? 0 : ((getMaxRotatedHeight(radarIcons[icon].width, radarIcons[icon].height) * resolvedScale) / 2) + 6 + 2;
            const textValue = hideText ? undefined : featureProperties.callsign;

            if (!text) {
                textStyle.setText(new Text({
                    text: textValue,
                    font: '600 11px LibreFranklin',
                    declutterMode: 'declutter',
                    textBaseline: 'middle',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 1)`,
                    }),
                    offsetY: Math.ceil(offsetY),
                }));

                text = textStyle.getText();
            }
            else if (textValue !== text.getText()) {
                text.setText(textValue);
            }

            const textFill = text!.getFill()!;

            text?.setOffsetY(Math.ceil(offsetY));

            if (ownFlight.value?.cid === cid && textStyle.getZIndex() !== 1) {
                textStyle.setZIndex(1);
            }

            let color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.[status === 'ground' ? 'ground' : 'main'];

            if (status === 'ground' && !color) color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.main;

            const pngImage = (status === 'default' || status === 'ground') && !list;

            const imageStyleKey = String(scaledWidth) +
                String(pngImage) +
                String(filterColor) +
                String(filterOpacity) +
                String(store.mapSettings.heatmapLayer) +
                String(color?.transparency) +
                String(color?.color) +
                String(status) +
                String(icon.icon);

            if (!styleCache.aircraftImage) {
                styleCache.aircraftImage = new Style();
            }

            if (!styleImageCache[imageStyleKey]) {
                let svg: string | null = null;

                if (!pngImage) svg = scheduleIconForFetch(icon.icon);

                if (pngImage || !svg) {
                    styleImageCache[imageStyleKey] = new Icon({
                        // TODO: add a setting
                        declutterMode: 'obstacle',
                        src: `/_ipx/w_${ Math.ceil(scaledWidth / 10) * 10 },quality_85,f_png/aircraft/${ icon }${ (filterColor || (color && color.color !== 'primary500')) ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }.png`,
                        width: scaledWidth,
                        rotation,
                        rotateWithView: true,
                        // @ts-expect-error Custom prop
                        status,
                        color: filterColor ? `rgb(${ hexToRgb(filterColor) })` : ((color && color.color !== 'primary500') ? getColorFromSettings(color) : undefined),
                        opacity: filterColor ? parseFloat(filterColor.split(',')[3]) : filterOpacity ?? (store.mapSettings.heatmapLayer ? 0 : (color?.transparency ?? 1)),
                    });
                }
                else {
                    styleImageCache[imageStyleKey] = new Icon({
                        declutterMode: 'obstacle',
                        src: svgToDataURI(reColorSvg(svg, status, cid)),
                        width: scaledWidth,
                        rotation,
                        rotateWithView: true,
                        // @ts-expect-error Custom prop
                        status,
                        opacity: Number(!store.mapSettings.heatmapLayer),
                    });
                }
            }

            styleCache.aicraftImage.setImage(styleImageCache[imageStyleKey]);
            if (styleImageCache[imageStyleKey]) {

            }

            if (image &&
                featureProperties.imageStatus === status &&
                featureProperties.icon === icon &&
                featureProperties.hadList === !!list &&
                featureProperties.filterColor === filterColor &&
                featureProperties.filterOpacity === filterOpacity &&
                featureProperties.imageScale === resolvedScale) {
                image.setRotation(rotation);
            }
            else {
                textFill.setColor(getAircraftStatusColor(status, cid));

                if ((status === 'default' || status === 'ground') && !list) {
                    let color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.[status === 'ground' ? 'ground' : 'main'];

                    if (status === 'ground' && !color) color = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.main;

                    imageStyle.setImage(new Icon({
                        declutterMode: 'obstacle',
                        src: `/_ipx/w_${ Math.ceil(scaledWidth / 10) * 10 },quality_85,f_png/aircraft/${ icon }${ (filterColor || (color && color.color !== 'primary500')) ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }.png`,
                        width: scaledWidth,
                        rotation,
                        rotateWithView: true,
                        // @ts-expect-error Custom prop
                        status,
                        color: filterColor ? `rgb(${ hexToRgb(filterColor) })` : ((color && color.color !== 'primary500') ? getColorFromSettings(color) : undefined),
                        opacity: filterColor ? parseFloat(filterColor.split(',')[3]) : filterOpacity ?? (store.mapSettings.heatmapLayer ? 0 : (color?.transparency ?? 1)),
                    }));
                }
                else {
                    imageStyle.setImage(new Icon({
                        declutterMode: 'obstacle',
                        src: svgToDataURI(reColorSvg(svg, status, cid)),
                        width: scaledWidth,
                        rotation,
                        rotateWithView: true,
                        // @ts-expect-error Custom prop
                        status,
                        opacity: Number(!store.mapSettings.heatmapLayer),
                    }));
                }
            }
        }
    });
}

export function setAircraftLineStyle(layer: VectorImageLayer) {

}
