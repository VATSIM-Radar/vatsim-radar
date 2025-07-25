import type { Coordinate } from 'ol/coordinate';
import { containsCoordinate } from 'ol/extent';
import { useStore } from '~/store';
import type { ShallowRef } from 'vue';
import type { Feature, Map } from 'ol';
import { copyText, sleep } from '~/utils';
import { useMapStore } from '~/store/map';
import { getRequestHeader, setHeader } from 'h3';
import type { Style } from 'ol/style';
import type { ColorsList } from '~/utils/backend/styles';
import type { Pixel } from 'ol/pixel';
import { createDefu } from 'defu';
import { addLeadingZero, getVACallsign, getVAWebsite } from '~/utils/shared';
import type { RadarDataAirline } from '~/utils/backend/storage';
import type { SelectItem } from '~/types/components/select';
import type { SigmetType } from '~/types/map';
import { useRadarError } from '~/composables/errors';
import { GeoJSON } from 'ol/format';

export function isPointInExtent(point: Coordinate, extent = useMapStore().extent) {
    return containsCoordinate(extent, point);
}

export function getCurrentThemeHexColor(color: ColorsList) {
    const store = useStore();
    const theme = store.theme ?? 'default';
    if (theme === 'default') return radarColors[`${ color }Hex`];

    // @ts-expect-error It will always be string
    return radarThemes[theme][`${ color as ColorsList }Hex`] ?? radarColors[`${ color }Hex`];
}
export function getCurrentThemeRgbColor<T = [number, number, number]>(color: ColorsList): T {
    const store = useStore();
    const theme = store.theme ?? 'default';
    if (theme === 'default') return radarColors[`${ color }Rgb`] as T;

    // @ts-expect-error It will always be string
    return radarThemes[theme][`${ color as ColorsList }Rgb`] ?? radarColors[`${ color }Rgb`];
}

export function attachMoveEnd(callback: (event: any) => unknown) {
    if (!getCurrentInstance()) throw new Error('Only can attach moveEnd on setup');
    let moveStarted = false;
    let registered = false;
    const map = inject<ShallowRef<Map | null>>('map')!;

    const startHandler = () => {
        moveStarted = true;
    };

    const endHandler = async (e: any) => {
        if (!moveStarted) return;
        moveStarted = false;
        await sleep(300);
        if (moveStarted) return;
        callback(e);
    };

    onBeforeUnmount(() => {
        map.value?.un('movestart', startHandler);
        map.value?.un('moveend', endHandler);
    });

    watch(map, val => {
        if (!map.value || registered) return;
        registered = true;

        map.value.on('movestart', startHandler);
        map.value.on('moveend', endHandler);
    }, {
        immediate: true,
    });
}

export function attachPointerMove(callback: (event: any) => unknown, delay = 300) {
    if (!getCurrentInstance()) throw new Error('Only can attach pointerMove on setup');
    const moveStarted = ref(false);
    let latestCoordinate: string | undefined;
    let registered = false;
    const map = inject<ShallowRef<Map | null>>('map')!;

    const startHandler = async (e: any) => {
        const coordinate = JSON.stringify(e.coordinate);
        latestCoordinate = coordinate;

        if (moveStarted) {
            await new Promise<void>(resolve => {
                const watcher = watch(moveStarted, async val => {
                    await sleep(0);
                    if (!val) {
                        watcher();
                        resolve();
                    }
                }, { immediate: true });
            });

            if (latestCoordinate !== coordinate) return;
        }
        try {
            moveStarted.value = true;
            await callback(e);
        }
        catch (e) {
            useRadarError(e);
        }
        finally {
            await sleep(delay);
            moveStarted.value = false;
        }
    };

    onBeforeUnmount(() => {
        map.value?.un('pointermove', startHandler);
    });

    watch(map, val => {
        if (!map.value || registered) return;
        registered = true;

        map.value.on('pointermove', startHandler);
    }, {
        immediate: true,
    });
}

export function useCopyText({ delay = 3000 }: { delay?: number } = {}) {
    const copied = ref(false);

    const copy = async (text: string) => {
        copied.value = true;
        await copyText(text);
        await sleep(delay);
        copied.value = false;
    };

    return {
        copyState: copied,
        copy,
    };
}

const iframeWhitelist = [
    'localhost',
    'vatsimsa.com',
    'vatcar.net',
    'idvacc.id',
    'vatcol.org',
    'urrv.me',
    'vatsim.net',
    'vatsim-petersburg.com',
    'vatsim-radar.com',
];

export function useIframeHeader() {
    if (import.meta.client) return;

    const event = useRequestEvent();
    if (!event) return;

    const referer = getRequestHeader(event, 'referer')?.split('/');
    let origin = referer?.[2]?.split(':')[0];

    const domain = origin?.split('.');
    if (domain) {
        origin = domain.slice(domain.length - 2, domain.length).join('.');
    }

    if (referer && origin && iframeWhitelist.includes(origin)) {
        setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self' ${ referer.slice(0, 3).join('/') }`);
    }
    else {
        setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self'`);
    }
}

export function getFeatureStyle<T extends Style | Style[] = Style>(feature: Feature): T | null {
    return feature.getStyle() as T | null;
}

export function useUpdateInterval(callback: () => any, interval = 15 * 1000) {
    if (!getCurrentInstance()) throw new Error('Vue instance is unavailable in useUpdateInterval');
    const store = useStore();

    function setUpdate() {
        callback();
        const intervalCode = setInterval(() => {
            if (!store.isTabVisible) return;
            callback();
        }, interval);
        onBeforeUnmount(() => clearInterval(intervalCode));
    }

    if (getCurrentInstance()?.isMounted) setUpdate();
    else onMounted(setUpdate);
}

export function useScrollExists(element: Ref<Element | null | undefined>): Ref<boolean> {
    if (!getCurrentInstance()) throw new Error('You are only allowed to call useScrollExists in root of setup');

    const scrollExists = ref(true);

    async function setScroll() {
        await nextTick();
        if (element.value) scrollExists.value = element.value.scrollHeight > element.value.clientHeight;
    }

    watch(element, setScroll, {
        immediate: true,
    });

    onUpdated(setScroll);

    return scrollExists;
}

export const useIsMobile = () => computed(() => useStore().isMobile);
export const useIsPC = () => computed(() => useStore().isPC);
export const useIsTablet = () => computed(() => useStore().isTablet);
export const useIsMobileOrTablet = () => computed(() => useStore().isMobileOrTablet);

export const collapsingWithOverlay = (map: MaybeRef<Map | null>, pixel: Pixel, excludeClassNames = ['aircraft']) => {
    map = toValue(map);
    if (!map) return false;

    let collapsingWithOverlay = false;

    map.getOverlays().forEach(overlay => {
        if (collapsingWithOverlay) return;

        if ([...overlay.getElement()?.classList ?? []].some(x => excludeClassNames.some(y => x.includes(y)))) return;

        const overlayElement = overlay.getElement();
        if (overlayElement) {
            const overlayRect = overlayElement.getBoundingClientRect();
            const mapRect = map.getTargetElement().getBoundingClientRect();
            const overlayPixel = [
                overlayRect.left - mapRect.left,
                overlayRect.top - mapRect.top,
            ];

            if (pixel[0] >= overlayPixel[0] && pixel[0] <= overlayPixel[0] + overlayRect.width &&
                pixel[1] >= overlayPixel[1] && pixel[1] <= overlayPixel[1] + overlayRect.height) {
                collapsingWithOverlay = true;
            }
        }
    });

    return collapsingWithOverlay;
};

export function getAirlineFromCallsign(callsign: string, remarks?: string): RadarDataAirline | null {
    const icao = /^(?<callsign>[A-Z]{0,3})[0-9]/.exec(callsign)?.groups?.callsign as string ?? null;
    if (!icao) return null;

    const airline = useDataStore().airlines.value.all[icao] as RadarDataAirline | undefined;

    if (!airline && !remarks) return airline ?? null;

    const vaCallsign = (remarks && useDataStore().airlines.value.virtual[icao]) ? getVACallsign(remarks) : null;
    const website = (remarks && useDataStore().airlines.value.virtual[icao]) ? getVAWebsite(remarks) : null;

    if (!vaCallsign && !airline) return null;

    return {
        ...airline,
        icao: airline?.icao ?? icao,
        callsign: (vaCallsign && vaCallsign?.callsign) ?? airline!.callsign,
        name: (vaCallsign && vaCallsign?.name) ?? airline!.name,
        website,
        virtual: vaCallsign ? true : airline!.virtual,
        virtualParsed: !!vaCallsign,
    };
}

export const customDefu = createDefu((obj, key, value) => {
    if (Array.isArray(obj[key]) && Array.isArray(value)) {
        obj[key] = value;
        return true;
    }

    if (value === null) {
        // @ts-expect-error Dunno why it says that
        obj[key] = null;
        return true;
    }
});

export const sigmetDates = () => computed<SelectItem[]>(() => {
    const dates: SelectItem[] = [
        {
            value: 'current',
            text: 'Current',
        },
    ];

    const date = new Date(useDataStore().time.value);
    const hour = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    if (minutes < 30) {
        dates.push({
            value: `${ date.getUTCFullYear() }-${ addLeadingZero(date.getUTCMonth() + 1) }-${ addLeadingZero(date.getUTCDate()) }T${ addLeadingZero(hour + 1) }:00:00.000Z`,
            text: `${ hour + 1 }Z`,
        });
    }

    for (let i = 2; i < 7; i++) {
        dates.push({
            value: `${ date.getUTCFullYear() }-${ addLeadingZero(date.getUTCMonth() + 1) }-${ addLeadingZero(date.getUTCDate()) }T${ addLeadingZero(hour + i) }:00:00.000Z`,
            text: `${ hour + i }Z`,
        });
    }

    return dates;
});

export const startDataStoreTimeUpdate = () => {
    if (!getCurrentInstance()) throw new Error('Only can use startDataStoreTimeUpdate in setup');

    const dataStore = useDataStore();

    onMounted(() => {
        const interval = setInterval(() => {
            dataStore.time.value = Date.now();
        }, 5000);

        onBeforeUnmount(() => clearInterval(interval));
    });
};

export const getSigmetType = (hazard: string | null | undefined): SigmetType | null => {
    if (hazard?.includes('OBSC')) return 'OBSC';
    if (hazard?.includes('FZLVL')) return 'FZLVL';
    if (hazard?.includes('WS')) return 'WS';
    if (hazard?.includes('WIND') || hazard?.includes('WND')) return 'WIND';

    if (hazard?.startsWith('TURB')) return 'TURB';
    if (hazard?.startsWith('TS')) return 'TS';
    if (hazard?.startsWith('ICE')) return 'ICE';
    if (hazard?.startsWith('VA')) return 'VA';
    if (hazard?.startsWith('MTW')) return 'MTW';
    if (hazard?.startsWith('IFR')) return 'IFR';

    return null;
};

export const cookiePolicyStatus = () => {
    const cookie = useCookie<{ rum: boolean; sentry: boolean; accepted: false | number }>('cookie-policy', {
        path: '/',
        sameSite: 'none',
        secure: true,
        maxAge: 60 * 60 * 24 * 30 * 12,
        default: () => ({ rum: true, sentry: true, accepted: false }),
    });

    return computed(() => {
        if (!cookie.value) cookie.value = { rum: true, sentry: true, accepted: false };

        return cookie.value;
    });
};

export const useIsDebug = () => import.meta.dev || !!useRuntimeConfig().public.VR_DEBUG;

export const geoJson = new GeoJSON({
    featureProjection: 'EPSG:4326',
    dataProjection: 'EPSG:4326',
});

export const updatePopupActive: false | string = '1.2.1';
export const showUpdatePopup = computed(() => !useStore().config.hideHeader && !!updatePopupActive && useStore().user?.settings.seenVersion !== updatePopupActive && localStorage.getItem('seen-version') !== updatePopupActive);

