import type { Coordinate } from 'ol/coordinate';
import { containsCoordinate } from 'ol/extent';
import { useStore } from '~/store';
import type { ShallowRef } from 'vue';
import type { Feature, Map } from 'ol';
import { copyText, sleep } from '~/utils';
import type { UserLocalSettings } from '~/types/map';
import { useMapStore } from '~/store/map';
import { setHeader, getRequestHeader } from 'h3';
import type { Style } from 'ol/style';
import { defu } from 'defu';
import type { ColorsList } from '~/utils/backend/styles';

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
export function getCurrentThemeRgbColor(color: ColorsList) {
    const store = useStore();
    const theme = store.theme ?? 'default';
    if (theme === 'default') return radarColors[`${ color }Rgb`];

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

export function setUserLocalSettings(settings?: UserLocalSettings) {
    const store = useStore();

    const settingsText = localStorage.getItem('local-settings') ?? '{}';
    if (!settings && JSON.stringify(store.localSettings) === settingsText) return;

    let localSettings = JSON.parse(settingsText) as UserLocalSettings;
    localSettings = defu(settings || {}, localSettings);
    if (settings?.location) localSettings.location = settings.location;

    store.localSettings = localSettings;
    localStorage.setItem('local-settings', JSON.stringify(localSettings));
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
    'idvacc.id',
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

    onMounted(() => {
        callback();
        const intervalCode = setInterval(callback, interval);
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
