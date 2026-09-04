import { useStore } from '~/store';
import type { ResolvableScript } from '@unhead/vue';

export default defineNuxtPlugin(async () => {
    const store = useStore();
    if (import.meta.server) {
        store.user = useRequestEvent()?.context.user ?? null;
        store.version = useRequestEvent()?.context.radarVersion ?? '';
        store.appVersion = useRequestEvent()?.headers.get('radarWebview') ?? null;
        await useIframeHeader();
    }

    const themeColor = getCurrentThemeHexColor('darkGray900');
    const policy = cookiePolicyStatus();

    useHead(() => {
        const theme = store.theme ?? 'default';
        const css = Object
            .entries({
                ...radarColors,
                ...(theme === 'default' ? {} : radarThemes[theme]),
            })
            .filter(([key]) => key.endsWith('Rgb') || (key.endsWith('Hex') && key.includes('Alpha')))
            .map(([key, value]) => {
                if (key.endsWith('Rgb')) return `--${ key.replace('Rgb', '') }: ${ (value as number[]).join(',') }`;
                return `--${ key.replace('Hex', '') }: ${ value }`;
            })
            .join(';');

        const script: ResolvableScript[] = [];

        // Don't inject the tracking code if this is run in local development. This prevents
        // CORS errors when attempting to navigate to /?bookmark={id} in local develompment.
        // The hostname checks only happen on the client side.
        const isLocalOrigin = import.meta.dev || (import.meta.client && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.endsWith('.local')
        ));

        if (policy.value.accepted && policy.value.rum && !isLocalOrigin) {
            script.push({
                tagPosition: 'bodyClose',
                defer: true,
                src: 'https://static.cloudflareinsights.com/beacon.min.js',
                'data-cf-beacon': '{"token": "e82abe7cc5a0420982b5e7d6b849bb79"}',
            });
        }

        return {
            titleTemplate(title) {
                if (!title) return 'VATSIM Radar';
                return `${ title } | VATSIM Radar`;
            },
            meta: [
                {
                    name: 'og:site_name',
                    content: 'VATSIM Radar',
                },
                {
                    name: 'og:type',
                    content: 'website',
                },
                {
                    name: 'og:locale',
                    content: 'en_US',
                },
                {
                    name: 'description',
                    content: 'Explore VATSIM Network in real-time, track pilots, check for controllers, view events - and more!',
                },
                {
                    name: 'og:description',
                    content: 'Explore VATSIM Network in real-time, track pilots, check for controllers, view events - and more!',
                },
                {
                    name: 'msapplication-TileColor',
                    content: themeColor,
                },
                {
                    name: 'theme-color',
                    content: themeColor,
                },
            ],
            htmlAttrs: {
                lang: 'en',
                class: [`theme-${ store.theme ?? 'default' }`, store.config.hideHeader ? `iframe` : '', store.config.hidePaddings ? 'hide-paddings' : ''],
            },
            style: [{
                key: 'radarStyles',
                innerHTML: `:root {${ css }}`,
            }],
            script,
        };
    });
});
