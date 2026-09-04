import type { VatsimExtendedPilot, VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';
import type { Map } from 'ol';
import type { ShallowRef } from 'vue';
import { computed } from 'vue';
import type { AircraftIcon } from '~/utils/icons';
import { useStore } from '~/store';
import type { ColorsList } from '~/utils/colors';
import { colorPresets } from '~/utils/shared/flight';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useRadarError } from '~/composables/errors';
import type { Pixel } from 'ol/pixel.js';
import { isHideMapObject } from '~/composables/settings';
import { collapsingWithOverlay, useColorFromProp } from '~/composables';
import type { UserMapSettingsTurns } from '~/utils/server/handlers/map-settings';
import { getKeyedValueFromSettings } from '~/composables/settings/v2/utils';
import { isValidDate } from '~/utils/shared';

export function usePilotRating(pilot: VatsimShortenedAircraft, short = false, noneIfDefault = false): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [];
    if (!noneIfDefault || pilot.pilot_rating) {
        const rating = dataStore.vatsim.data.pilot_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'];
        if (rating) ratings.push(rating);
    }
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data.military_ratings.value.find(x => x.id === pilot.military_rating)?.[short ? 'short_name' : 'long_name'] ?? pilot.military_rating.toString());

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

    console.log(isPilotOnGround(pilot));

    view?.animate({
        center: [pilot.longitude, pilot.latitude],
        zoom: zoom ?? (isPilotOnGround(pilot) ? 17 : 7),
    });
}

export const allArrivedPilots = new Set<number>();

export const allPilotsOnGround = computed(() => {
    const allPilotsOnGround = new Set<number>();
    allArrivedPilots.clear();
    const dataStore = useDataStore();
    for (const icao in dataStore.airportsList.value) {
        const airport = dataStore.airportsList.value[icao];
        if (!airport) continue;

        const arr = airport.aircraft.groundArr;
        if (arr) {
            for (const cid of arr) {
                allPilotsOnGround.add(cid);
                allArrivedPilots.add(cid);
            }
        }
        const dep = airport.aircraft.groundDep;
        if (dep) for (const cid of dep) allPilotsOnGround.add(cid);
    }

    return allPilotsOnGround;
});

export function isPilotOnGround(pilot: VatsimShortenedAircraft | VatsimExtendedPilot | VatsimMandatoryPilot) {
    return 'isOnGround' in pilot
        ? pilot.isOnGround
        : allPilotsOnGround.value.has(pilot.cid);
}

export function getPilotStatus(status: VatsimExtendedPilot['status'], isOffline = false): { color: ColorsList; title: string } {
    if (isOffline) {
        return {
            color: 'whiteAlpha24',
            title: 'Offline',
        };
    }

    switch (status) {
        case 'depGate':
            return {
                color: 'green500',
                title: 'Departing | At gate',
            };
        case 'depTaxi':
            return {
                color: 'green500',
                title: 'Departing',
            };
        case 'departed':
            return {
                color: 'blue300',
                title: 'Departed',
            };
        case 'climbing':
            return {
                color: 'blue400',
                title: 'Climbing',
            };
        case 'enroute':
            return {
                color: 'blue500',
                title: 'Enroute',
            };
        case 'cruising':
            return {
                color: 'blue500',
                title: 'Cruising',
            };
        case 'descending':
            return {
                color: 'orange400',
                title: 'Descending',
            };
        case 'arriving':
            return {
                color: 'orange500',
                title: 'Arriving',
            };
        case 'arrTaxi':
            return {
                color: 'red500',
                title: 'Arrived',
            };
        case 'arrGate':
            return {
                color: 'red500',
                title: 'Arrived | At gate',
            };
        default:
            return {
                color: 'whiteAlpha64',
                title: 'Status unknown',
            };
    }
}

export const aircraftStatusColors: Record<MapAircraftStatus, ColorsList> = {
    active: 'orange600',
    default: 'blue500',
    ground: 'blue500',
    green: 'green600',
    hover: 'orange500',
    neutral: 'lightGray500',

    departing: 'green500',
    arriving: 'orange400',
    landed: 'red300',
    emergency: 'red500',
};

export const aircraftSvgColors = () => {
    return Object.fromEntries(Object.entries(aircraftStatusColors).map(([key, value]) => [key, getCurrentThemeHexColor(value)])) as Record<MapAircraftStatus, string>;
};

export const getFilteredAircraftSettings = (cid: number) => {
    const store = useStore();
    const dataStore = useDataStore();

    if (hasActivePilotFilter() && typeof store.activeFilter?.others === 'object' && (store.activeFilter.others.ourColor || typeof store.activeFilter.others.othersOpacity === 'number')) {
        const pilot = dataStore.vatsim.data.keyedPilots.value?.[cid];
        if (pilot?.filteredColor) return pilot.filteredColor;
        else return pilot?.filteredOpacity;
    }
};

export const getAircraftStatusColor = (status: MapAircraftStatus, cid?: number) => {
    const list = cid && getUserList(cid);
    if (list && status !== 'emergency') {
        return getCurrentThemeHexColor(list.color as any) || `rgb(${ list.color })`;
    }

    if (status === 'emergency') return aircraftSvgColors().emergency;

    const store = useStore();

    if (store.activeDashboard && status !== 'hover' && cid) {
        const aircraft = useDataStore().vatsim.data.keyedPilots.value[cid];
        const airports = Object.fromEntries(store.activeDashboard.airports.filter(x => x.aircraftColor).map(x => [x.icao, x.aircraftColor]));

        if (aircraft?.departure && aircraft.arrival) {
            const arrivalColor = airports[aircraft.arrival];

            if (arrivalColor) return useColorFromProp(arrivalColor);
        }
    }

    let filteredColor: ReturnType<typeof getFilteredAircraftSettings> | undefined;

    if (cid && status === 'default') {
        filteredColor = getFilteredAircraftSettings(cid);

        if (typeof filteredColor === 'object') return getColorFromSettings(filteredColor);
    }

    let color = aircraftSvgColors()[status];
    let settingColor = getColorByKey(`map.preferences.colors.default.aircraft.${ status === 'default' ? 'main' : status }` as any).value.value;
    if (status === 'ground' && !settingColor) settingColor = getColorByKey('map.preferences.colors.default.aircraft.main').value.value;
    if (settingColor) color = getColorFromSettings(settingColor);

    if (typeof filteredColor === 'number') {
        return `rgba(${ hexToRgb(color) }, ${ filteredColor })`;
    }

    return color;
};

export function reColorSvg(svg: string, status: MapAircraftStatus, cid?: number, color?: string) {
    const store = useStore();

    color ??= getAircraftStatusColor(status, cid);

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

export type MapAircraftStatus = 'default' | 'ground' | 'green' | 'active' | 'hover' | 'neutral' | 'arriving' | 'departing' | 'landed' | 'emergency';

const svgIconsCache: Record<string, string | Promise<string>> = {};

export async function fetchAircraftSvgIcon(icon: AircraftIcon) {
    const store = useStore();
    let svg = svgIconsCache[icon];

    if (typeof svg === 'object') svg = await svg;
    else if (!svg) {
        svgIconsCache[icon] = new Promise<string>(async (resolve, reject) => {
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
        await svgIconsCache[icon];
    }

    return svg;
}

export async function fetchAircraftPngIcon(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            resolve(img);
        };

        img.onerror = () => {
            reject(new Error(`Failed to load aircraft png icon: ${ src }`));
            return;
        };

        img.src = src;
    });
}

export const useShowPilotStats = () => {
    const store = useStore();

    const cookie = useCookie<boolean>('show-pilot-stats', {
        sameSite: 'none',
        path: '/',
        secure: true,
        default: () => false,
    });

    store.showPilotStats = cookie.value ?? false;

    return computed({
        get() {
            return store.showPilotStats;
        },
        set(value: boolean) {
            cookie.value = value;
            store.showPilotStats = value;
        },
    });
};

export function getFlightRowColor(index: number | null | undefined, theme = useStore().theme) {
    if (typeof index !== 'number' || index < 0) return radarColors.green600Hex;

    const turnsTheme = getKeyedValueFromSettings('map.preferences.colors.turns') as UserMapSettingsTurns;

    switch (theme) {
        case 'default':
            return colorPresets[turnsTheme].dark[index];
        case 'light':
            return colorPresets[turnsTheme].light[index];
    }
}

export function getTimeRemains(eta: Date): string | null {
    if (!isValidDate(eta)) return null;
    const timeRemains = eta.getTime() - useDataStore().time.value;
    if (timeRemains < 0) return null;

    const minutes = timeRemains / (1000 * 60);
    return `${ `0${ Math.floor(minutes / 60) }`.slice(-2) }:${ `0${ Math.floor(minutes % 60) }`.slice(-2) }h`;
}

/**
 * @deprecated
 */
export function getPilotsForPixel(map: Map, pixel: Pixel, tolerance = 5, exitOnAnyOverlay = false) {
    if (!pixel || isHideMapObject('pilots')) return [];

    const mapStore = useMapStore();
    const dataStore = useDataStore();

    if (exitOnAnyOverlay && mapStore.openOverlayId) return [];

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
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
}));

export const observerFlight = computed(() => {
    const dataStore = useDataStore();
    const store = useStore();

    const obs = store.user?.cid && dataStore.vatsim.data.observers.value.find(x => x.cid === +store.user!.cid!);
    if (!obs) return null;

    const similar = dataStore.vatsim.data.pilots.value.find(x => x.callsign === obs.callsign.slice(0, obs.callsign.length - 1));

    return similar ?? null;
});

export const ownFlight = computed(() => {
    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();

    if (!store.user?.cid) return null;
    if (mapStore.selectedCid && dataStore.vatsim.data.observers.value.some(x => x.cid === +store.user!.cid!)) {
        return dataStore.vatsim.data.keyedPilots.value[mapStore.selectedCid.toString()] ??
        dataStore.vatsim.data.keyedPilots.value[store.user.cid.toString()] ??
        null;
    }
    return dataStore.vatsim.data.keyedPilots.value[store.user.cid.toString()] ?? null;
});

export const ownAtc = globalComputed(() => {
    const _cid = useStore().user?.cid;
    if (!_cid) return null;

    const cid = +_cid;
    const atc = useDataStore().vatsim.data.controllers.value.find(x => x.cid === cid);
    return atc ?? null;
});

const ownHighlight = globalComputed(() => getKeyedValueFromSettings('map.preferences.aircraft.ownAtcHighlight'));

export const ownATC = globalComputed(() => {
    if (!ownFlight.value || !ownHighlight().value) return [];

    const dataStore = useDataStore();

    const frequencies = new Set(ownFlight.value.frequencies);

    const atc = dataStore.vatsim.data.controllers.value.filter(x => x.frequencies?.some(x => frequencies.has(x)));

    const callsings: string[] = [];

    for (const controller of atc) {
        const sector = findATCSector(controller);

        if (sector && isPointInExtent([ownFlight.value.longitude, ownFlight.value.latitude], sector)) callsings.push(controller.callsign);
    }

    return callsings;
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
