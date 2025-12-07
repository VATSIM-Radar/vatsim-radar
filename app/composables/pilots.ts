import type { VatsimExtendedPilot, VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';
import type { Feature, Map } from 'ol';
import type { ShallowRef } from 'vue';
import { computed } from 'vue';
import type { AircraftIcon } from '~/utils/icons';
import { Icon, Stroke, Style, Text, Fill } from 'ol/style';
import { useStore } from '~/store';
import type { ColorsList } from '~/utils/backend/styles';
import { colorPresets } from '~/utils/shared/flight';
import { getColorFromSettings, hexToRgb } from '~/composables/colors';
import { getUserList } from '~/composables/fetchers/lists';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useRadarError } from '~/composables/errors';
import type { Pixel } from 'ol/pixel';
import { isHideMapObject } from '~/composables/settings';
import { collapsingWithOverlay } from '~/composables/index';

export function usePilotRating(pilot: VatsimShortenedAircraft, short = false): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [dataStore.vatsim.data.pilot_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? ''];
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data.military_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? pilot.military_rating.toString());

    return ratings;
}

export function usePilotRatings() {
    const dataStore = useDataStore();

    return {
        NEW: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'NEW')?.id ?? -1,
        PPL: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'PPL')?.id ?? -1,
        IR: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'IR')?.id ?? -1,
        CMEL: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'CMEL')?.id ?? -1,
        ATPL: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'ATPL')?.id ?? -1,
        FI: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'FI')?.id ?? -1,
        FE: dataStore.vatsim.data.pilot_ratings.value.find(x => x.short_name === 'FE')?.id ?? -1,
    };
}

export function getAirportByIcao(icao?: string | null | undefined): VatSpyData['airports'][0] | null {
    if (!icao) return null;

    return useDataStore().vatspy.value?.data.keyAirports.realIcao[icao] ?? null;
}

export async function showPilotOnMap(pilot: VatsimShortenedAircraft | VatsimExtendedPilot, map: Map | null, zoom?: number) {
    map = map || inject<ShallowRef<Map | null>>('map')!.value;
    const view = map?.getView();
    const mapStore = useMapStore();

    mapStore.overlays.filter(x => x.type === 'pilot').forEach(x => (x as StoreOverlayPilot).data.tracked = false);
    await nextTick();

    view?.animate({
        center: [pilot.longitude, pilot.latitude],
        zoom: zoom ?? (isPilotOnGround(pilot) ? 17 : 7),
    });
}

export function isPilotOnGround(pilot: VatsimShortenedAircraft | VatsimExtendedPilot | VatsimMandatoryPilot) {
    const dataStore = useDataStore();

    return 'isOnGround' in pilot
        ? pilot.isOnGround
        : dataStore.vatsim.data.airports.value.some(x => x.aircraft.groundArr?.includes(pilot.cid) || x.aircraft.groundDep?.includes(pilot.cid));
}

export function getPilotStatus(status: VatsimExtendedPilot['status'], isOffline = false): { color: ColorsList; title: string } {
    if (isOffline) {
        return {
            color: 'darkgray800',
            title: 'Offline',
        };
    }

    switch (status) {
        case 'depGate':
            return {
                color: 'success500',
                title: 'Departing | At gate',
            };
        case 'depTaxi':
            return {
                color: 'success500',
                title: 'Departing',
            };
        case 'departed':
            return {
                color: 'warning500',
                title: 'Departed',
            };
        case 'enroute':
            return {
                color: 'primary500',
                title: 'Enroute',
            };
        case 'cruising':
            return {
                color: 'primary500',
                title: 'Cruising',
            };
        case 'climbing':
            return {
                color: 'primary400',
                title: 'Climbing',
            };
        case 'descending':
            return {
                color: 'primary600',
                title: 'Descending',
            };
        case 'arriving':
            return {
                color: 'warning600',
                title: 'Arriving',
            };
        case 'arrTaxi':
            return {
                color: 'error500',
                title: 'Arrived',
            };
        case 'arrGate':
            return {
                color: 'error500',
                title: 'Arrived | At gate',
            };
        default:
            return {
                color: 'darkgray1000',
                title: 'Status unknown',
            };
    }
}

const icons: Record<string, string | Promise<string>> = {};

export const aircraftSvgColors = (): Record<MapAircraftStatus, string> => {
    return {
        active: getCurrentThemeHexColor('warning700'),
        default: getCurrentThemeHexColor('primary500'),
        ground: getCurrentThemeHexColor('primary500'),
        green: getCurrentThemeHexColor('success500'),
        hover: getCurrentThemeHexColor('warning600'),
        neutral: getCurrentThemeHexColor('lightgray150'),

        departing: getCurrentThemeHexColor('success400'),
        arriving: getCurrentThemeHexColor('warning500'),
        landed: getCurrentThemeHexColor('error300'),
    };
};

const getFilteredAircraftSettings = (cid: number) => {
    const store = useStore();
    const dataStore = useDataStore();

    if (hasActivePilotFilter() && typeof store.activeFilter.others === 'object' && (store.activeFilter.others.ourColor || typeof store.activeFilter.others.othersOpacity === 'number')) {
        const pilot = dataStore.vatsim.data.keyedPilots.value?.[cid];
        if (pilot?.filteredColor) return pilot.filteredColor;
        else return pilot?.filteredOpacity;
    }
};

export const getAircraftStatusColor = (status: MapAircraftStatus, cid?: number) => {
    const store = useStore();

    const list = cid && getUserList(cid);
    if (list) {
        return getCurrentThemeHexColor(list.color as any) || `rgb(${ list.color })`;
    }

    let filteredColor: ReturnType<typeof getFilteredAircraftSettings> | undefined;

    if (cid && status === 'default') {
        filteredColor = getFilteredAircraftSettings(cid);

        if (typeof filteredColor === 'object') return getColorFromSettings(filteredColor);
    }

    let color = aircraftSvgColors()[status];
    let settingColor = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.[status === 'default' ? 'main' : status];
    if (status === 'ground' && !settingColor) settingColor = store.mapSettings.colors?.[store.getCurrentTheme]?.aircraft?.main;
    if (settingColor) color = getColorFromSettings(settingColor);

    if (typeof filteredColor === 'number') {
        return `rgba(${ hexToRgb(color) }, ${ filteredColor })`;
    }

    return color;
};

export function reColorSvg(svg: string, status: MapAircraftStatus, cid?: number) {
    const store = useStore();

    const color = getAircraftStatusColor(status, cid);

    let iconContent = svg
        .replaceAll('\n', '')
        .replaceAll('white', color)
        .replaceAll('#F8F8FA', color)
        .replaceAll('#FFFFFF', color)
        .replaceAll('#FFF', color);

    if (store.theme === 'light') {
        iconContent = iconContent
            .replaceAll('black', 'white')
            .replaceAll('#000000', 'white')
            .replaceAll('#000', 'white')
            .replaceAll('#231F20', 'white');
    }

    return iconContent;
}

function svgToDataURI(svg: string) {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${ encoded }`;
}

export type MapAircraftStatus = 'default' | 'ground' | 'green' | 'active' | 'hover' | 'neutral' | 'arriving' | 'departing' | 'landed';

export async function fetchAircraftIcon(icon: AircraftIcon) {
    const store = useStore();
    let svg = icons[icon];

    if (typeof svg === 'object') svg = await svg;
    else if (!svg) {
        icons[icon] = new Promise<string>(async (resolve, reject) => {
            try {
                const result = await $fetch<string>(`/aircraft/${ icon }.svg?v=${ store.version }`, { responseType: 'text' });
                svg = result;
                resolve(result);
            }
            catch (e) {
                useRadarError(e);
                reject();
            }
        });
        await icons[icon];
    }

    return svg;
}

function getMaxRotatedHeight(width: number, height: number): number {
    return Math.sqrt((width * width) + (height * height));
}

export async function loadAircraftIcon({ feature, icon, status, style: styles, rotation, force, cid, scale, onGround }: {
    feature: Feature;
    icon: AircraftIcon;
    rotation: number;
    status: MapAircraftStatus;
    style: Style[];
    force?: boolean;
    onGround?: boolean;
    cid: number;
    scale?: number;
}) {
    if (icon === 'ball') rotation = 0;

    const [textStyle, imageStyle] = styles;

    const store = useStore();
    let resolvedScale = typeof scale === 'number' ? scale : (store.mapSettings.aircraftScale ?? 1);

    const image = imageStyle.getImage();

    const featureProperties = feature.getProperties() ?? {};
    const list = getUserList(cid);

    const filter = getFilteredAircraftSettings(cid);
    let filterColor: string | undefined;
    let filterOpacity: number | undefined;

    if (filter) {
        if (typeof filter === 'number') filterOpacity = filter;
        else {
            filterColor = getColorFromSettings(filter);
        }
    }

    if (resolvedScale > 4) resolvedScale = 4;

    let text = textStyle.getText();
    const offsetY = ((getMaxRotatedHeight(radarIcons[icon].width, radarIcons[icon].height) * resolvedScale) / 2) + 6 + 2;

    const declutter = ownFlight.value?.cid !== cid && useMapStore().zoom < 18;
    const declutterMode = declutter ? 'declutter' : 'none';

    const scaledWidth = radarIcons[icon].width * resolvedScale;
    const hideText = scaledWidth < 10 || useDataStore().visiblePilots.value.length > (store.mapSettings.pilotLabelLimit ?? 100);
    const textValue = hideText ? undefined : featureProperties.callsign;

    if (!text || text.getDeclutterMode() !== declutterMode) {
        textStyle.setText(new Text({
            text: textValue,
            font: '600 11px Montserrat',
            declutterMode,
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

    if (!force &&
        image &&
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
                src: `/aircraft/${ icon }${ (filterColor || (color && color.color !== 'primary500')) ? '-white' : '' }${ store.theme === 'light' ? '-light' : '' }.webp?v=${ store.version }`,
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
            const svg = await fetchAircraftIcon(icon);

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

    feature.setProperties({
        ...featureProperties,
        imageStatus: status,
        icon,
        hadList: !!list,
        filterColor,
        filterOpacity,
        imageScale: resolvedScale,
    });
}

const lineStyles: {
    color: string;
    style: Style;
    lineDash?: string;
    width: number;
}[] = [];

export function getAircraftLineStyle(color: string | number | null | undefined, width = 2, lineDash?: number[]): Style {
    const store = useStore();

    let hex = typeof color === 'string' ? color : getFlightRowColor(color);

    if (store.mapSettings.colors?.turnsTransparency) {
        const rgb = hexToRgb(hex);

        hex = `rgba(${ rgb }, ${ store.mapSettings.colors?.turnsTransparency })`;
    }

    const existingStyle = lineStyles.find(x => x.color === hex && x.width === width && (!lineDash || x.lineDash === JSON.stringify(lineDash)));
    if (existingStyle) return existingStyle.style;

    const style = {
        color: hex,
        width,
        lineDash: lineDash && JSON.stringify(lineDash),
        style: new Style({
            stroke: new Stroke({ color: hex, width, lineDash }),
        }),
    };

    lineStyles.push(style);
    return style.style;
}

export const useShowPilotStats = () => {
    const store = useStore();

    store.showPilotStats = useCookie<boolean>('show-pilot-stats', {
        sameSite: 'none',
        secure: true,
    }).value ?? false;

    return computed({
        get() {
            return store.showPilotStats;
        },
        set(value: boolean) {
            useCookie<boolean>('show-pilot-stats', {
                sameSite: 'none',
                secure: true,
            }).value = value;
            store.showPilotStats = value;
        },
    });
};

export function getFlightRowColor(index: number | null | undefined, theme = useStore().theme) {
    if (typeof index !== 'number' || index < 0) return radarColors.success700Hex;

    const turnsTheme = useStore().mapSettings.colors?.turns ?? 'magma';

    switch (theme) {
        case 'sa':
        case 'default':
            return colorPresets[turnsTheme].dark[index];
        case 'light':
            return colorPresets[turnsTheme].light[index];
    }
}

export function getTimeRemains(eta: Date): string | null {
    const timeRemains = eta.getTime() - useDataStore().time.value;
    if (timeRemains < 0) return null;

    const minutes = timeRemains / (1000 * 60);
    return `${ `0${ Math.floor(minutes / 60) }`.slice(-2) }:${ `0${ Math.floor(minutes % 60) }`.slice(-2) }h`;
}

export function getPilotsForPixel(map: Map, pixel: Pixel, tolerance = 25, exitOnAnyOverlay = false) {
    if (!pixel || isHideMapObject('pilots')) return [];

    const mapStore = useMapStore();
    const dataStore = useDataStore();

    if (exitOnAnyOverlay && mapStore.openOverlayId && !mapStore.openPilotOverlay) return [];

    if (collapsingWithOverlay(map, pixel)) return []; // The mouse is over an relevant overlay, we don't want to return any pilot

    const featuresFilter = map.getFeaturesAtPixel(pixel, {
        hitTolerance: tolerance, // we use 6 instead of 5 because of the aircraft icons size, it is just for cosmetic reasons
        layerFilter: layer => layer.getProperties().type === 'aircraft',
    });

    return featuresFilter.map(x => dataStore.vatsim.data.keyedPilots.value[x.getProperties().id]).filter(x => x);
}

export function aircraftCoordsToPixel(map: Map, aircraft: VatsimMandatoryPilot): Pixel | null {
    return map.getPixelFromCoordinate([aircraft.longitude, aircraft.latitude]);
}

export const skipObserver = computed(() => useCookie<boolean>('observer-skip', {
    path: '/',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
}));

export const observerFlight = computed(() => {
    const dataStore = useDataStore();
    const store = useStore();

    const obs = store.user && dataStore.vatsim.data.observers.value.find(x => x.cid === +store.user!.cid);
    if (!obs) return null;

    const similar = dataStore.vatsim.data.pilots.value.find(x => x.callsign === obs.callsign.slice(0, obs.callsign.length - 1));

    return similar ?? null;
});

export const ownFlight = computed(() => {
    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();

    if (!store.user) return null;
    if (mapStore.selectedCid && dataStore.vatsim.data.observers.value.some(x => x.cid === +store.user!.cid)) {
        return dataStore.vatsim.data.keyedPilots.value[mapStore.selectedCid.toString()] ??
        dataStore.vatsim.data.keyedPilots.value[store.user.cid.toString()] ??
        null;
    }
    return dataStore.vatsim.data.keyedPilots.value[store.user.cid.toString()] ?? null;
});

export function getAircraftDistance(pilot: VatsimExtendedPilot | VatsimShortenedAircraft): Pick<VatsimExtendedPilot, 'toGoTime' | 'toGoDist' | 'toGoPercent' | 'stepclimbs' | 'depDist'> | null {
    if (!pilot) return null;

    const dataStore = useDataStore();
    return Object.assign({
        depDist: dataStore.navigraphWaypoints.value[String(pilot.cid)]?.calculatedArrival?.depDist ?? pilot?.depDist,
        toGoDist: pilot?.toGoDist,
        toGoTime: 'toGoTime' in pilot && pilot?.toGoTime,
        toGoPercent: 'toGoPercent' in pilot && pilot?.toGoPercent,
        stepclimbs: 'stepclimbs' in pilot && pilot?.stepclimbs,
    }, (pilot.status === 'arrTaxi' || pilot.status === 'arrGate') ? {} : dataStore.navigraphWaypoints.value[String(pilot.cid)]?.calculatedArrival ?? {});
}
