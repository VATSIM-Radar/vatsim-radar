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
import { getVACallsign, getVAWebsite } from '~/utils/shared';
import type { RadarDataAirline } from '~/utils/backend/storage';

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

export function attachPointerMove(callback: (event: any) => unknown) {
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
            console.error(e);
        }
        finally {
            await sleep(300);
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

export function useCopyText() {
    const copied = ref(false);

    const copy = async (text: string) => {
        copied.value = true;
        await copyText(text);
        await sleep(3000);
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

    onMounted(() => {
        callback();
        const intervalCode = setInterval(() => {
            if (!store.isTabVisible) return;
            callback();
        }, interval);
        onBeforeUnmount(() => clearInterval(intervalCode));
    });
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
