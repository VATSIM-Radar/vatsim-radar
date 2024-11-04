import type { VatsimExtendedPilot, VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';
import type { Feature, Map } from 'ol';
import type { ShallowRef } from 'vue';
import type { AircraftIcon } from '~/utils/icons';
import { Style, Icon, Stroke } from 'ol/style';
import { useStore } from '~/store';
import type { ColorsList } from '~/utils/backend/styles';
import { colorPresets } from '~/utils/shared/flight';

export function usePilotRating(pilot: VatsimShortenedAircraft, short = false): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [dataStore.vatsim.data.pilot_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? ''];
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data.military_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? pilot.military_rating.toString());

    return ratings;
}

export function getAirportByIcao(icao?: string | null): VatSpyData['airports'][0] | null {
    if (!icao) return null;

    return useDataStore().vatspy.value!.data.airports.find(x => x.icao === icao) ?? null;
}

export function showPilotOnMap(pilot: VatsimShortenedAircraft | VatsimExtendedPilot, map: Map | null, zoom?: number) {
    map = map || inject<ShallowRef<Map | null>>('map')!.value;
    const view = map?.getView();

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
        green: getCurrentThemeHexColor('success500'),
        hover: getCurrentThemeHexColor('warning600'),
        neutral: getCurrentThemeHexColor('lightgray150'),

        departing: getCurrentThemeHexColor('success400'),
        arriving: getCurrentThemeHexColor('warning500'),
        landed: getCurrentThemeHexColor('error300'),
    };
};

export function reColorSvg(svg: string, status: MapAircraftStatus) {
    const store = useStore();

    let iconContent = svg
        .replaceAll('\n', '')
        .replaceAll('white', aircraftSvgColors()[status])
        .replaceAll('#F8F8FA', aircraftSvgColors()[status]);

    if (store.theme === 'light') iconContent = iconContent.replaceAll('black', 'white').replaceAll('#231F20', 'white');

    return iconContent;
}

function svgToDataURI(svg: string) {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${ encoded }`;
}

export type MapAircraftStatus = 'default' | 'green' | 'active' | 'hover' | 'neutral' | 'arriving' | 'departing' | 'landed';

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
                console.error(e);
                reject();
            }
        });
        await icons[icon];
    }

    return svg;
}

export async function loadAircraftIcon({ feature, icon, status, style, rotation, force }: {
    feature: Feature;
    icon: AircraftIcon;
    rotation: number;
    status: MapAircraftStatus;
    style: Style;
    force?: boolean;
}) {
    const store = useStore();

    const image = style.getImage();

    const featureProperties = feature.getProperties() ?? {};

    if (!force && image && featureProperties.imageStatus === status && featureProperties.icon === icon) {
        image.setRotation(rotation);
    }
    else {
        if (status === 'default') {
            style.setImage(new Icon({
                src: `/aircraft/${ icon }${ store.theme === 'light' ? '-light' : '' }.png`,
                width: radarIcons[icon].width,
                rotation,
                rotateWithView: true,
                // @ts-expect-error Custom prop
                status,
            }));
        }
        else {
            const svg = await fetchAircraftIcon(icon);
            style.setImage(new Icon({
                src: svgToDataURI(reColorSvg(svg, status)),
                width: radarIcons[icon].width,
                rotation,
                rotateWithView: true,
                // @ts-expect-error Custom prop
                status,
            }));
        }
    }

    feature.setProperties({
        ...featureProperties,
        imageStatus: status,
        icon,
    });
}

const lineStyles: {
    color: string;
    style: Style;
    lineDash?: string;
    width: number;
}[] = [];

export function getAircraftLineStyle(color: string | number | null, width = 1.5, lineDash?: number[]): Style {
    const hex = typeof color === 'string' ? color : getFlightRowColor(color);
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
        sameSite: 'strict',
        secure: true,
    }).value ?? false;

    return computed({
        get() {
            return store.showPilotStats;
        },
        set(value: boolean) {
            useCookie<boolean>('show-pilot-stats', {
                sameSite: 'strict',
                secure: true,
            }).value = value;
            store.showPilotStats = value;
        },
    });
};

export function getFlightRowColor(index: number | null, theme = useStore().theme) {
    if (typeof index !== 'number' || index < 0) return radarColors.success700Hex;

    switch (theme) {
        case 'sa':
        case 'default':
            return colorPresets.dark[index];
        case 'light':
            return colorPresets.light[index];
    }
}

export function getTimeRemains(eta: Date): string | null {
    const timeRemains = eta.getTime() - useDataStore().time.value;
    if (timeRemains < 0) return null;

    const minutes = timeRemains / (1000 * 60);
    return `${ `0${ Math.floor(minutes / 60) }`.slice(-2) }:${ `0${ Math.floor(minutes % 60) }`.slice(-2) }h`;
}
