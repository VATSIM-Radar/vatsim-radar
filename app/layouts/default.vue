<template>
    <div
        v-if="!hadRestrictedAuth"
        class="app"
    >
        <nuxt-pwa-manifest/>
        <view-header v-if="!store.config.hideHeader"/>
        <div class="app_content">
            <client-only>
                <view-init-popup/>
                <view-update-popup v-if="!hasObs() && showUpdatePopup"/>
                <view-metar v-if="store.metarRequest"/>
            </client-only>
            <nuxt-loading-indicator color="rgb(var(--blue500))"/>
            <slot/>
        </div>
        <layout-update-popup/>
        <div
            v-if="!store.config.hideFooter"
            class="app_footer"
        >
            <view-footer v-if="route.path === '/'"/>
            <div
                v-else
                class="app_footer_info"
            >
                <div v-if="store.version">
                    v{{ store.version }}
                </div>
            </div>
        </div>
        <client-only>
            <layout-consent/>
        </client-only>
        <layout-consent-popup/>
        <layout-notifications/>
    </div>
    <view-restricted-auth
        v-else
        v-once
    />
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import ViewHeader from '~/components/features/header/ViewHeader.vue';
import ViewFooter from '~/components/features/footer/ViewFooter.vue';
import { checkAndSetMapPreset } from '~/composables/map/presets';
import ViewRestrictedAuth from '~/components/views/ViewRestrictedAuth.vue';

import type { ThemesList } from '~/utils/colors';
import { UAParser } from 'ua-parser-js';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import type { ResolvableScript } from '@unhead/vue';
import ViewInitPopup from '~/components/views/ViewInitPopup.vue';
import { showUpdatePopup } from '~/composables';
import { isFetchError } from '~/utils/shared';
import LayoutNotifications from '~/components/features/layout/LayoutNotifications.vue';
import LayoutUpdatePopup from '~/components/features/layout/LayoutUpdatePopup.vue';
import LayoutConsent from '~/components/features/layout/LayoutConsent.vue';
import LayoutConsentPopup from '~/components/features/layout/LayoutConsentPopup.vue';

defineSlots<{ default: () => any }>();

const store = useStore();
const route = useRoute();

const ViewUpdatePopup = defineAsyncComponent(() => import('~/components/views/ViewUpdatePopup.vue'));
const ViewMetar = defineAsyncComponent(() => import('~/components/popups/PopupMetar.vue'));

const theme = useCookie<ThemesList>('theme', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});

store.theme = theme.value ?? 'default';

checkAndSetMapPreset();

defineRouteRules({
    prerender: true,
});

const event = useRequestEvent();
const restrictedState = useState('auth-restricted', () => !!event?.context.authRestricted);
const hadRestrictedAuth = restrictedState.value;

// @ts-expect-error OBS check
const hasObs = () => typeof window.obsstudio !== 'undefined';

onMounted(() => {
    const handleStorageUpdate = () => {
        setUserLocalSettings();
    };

    window.addEventListener('storage', handleStorageUpdate);

    onBeforeUnmount(() => {
        window.removeEventListener('storage', handleStorageUpdate);
    });

    if (!theme.value && !route.query.preset) {
        if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
            theme.value = 'light';
        }
        else {
            theme.value = 'default';
        }

        store.theme = theme.value;
    }

    if (store.user?.isSup) {
        $fetch('/api/user/supervisor', {
            method: 'POST',
            body: {
                enabled: true,
            },
        }).catch(e => {
            if (isFetchError(e)) {
                if (e.status === 403) {
                    alert(`Uh oh, it seems you are no longer a sup, or an unknown issue in VATSIM Radar has occurred. We're sorry (and also removed sup flag from your account)`);
                    store.user!.isSup = false;
                }
            }
        });
    }
});

/* watch(() => policy.value.sentry, val => {
    if (store.user && policy.value.accepted && val) {
        Sentry.setUser({ id: store.user.cid });
    }
    else {
        Sentry.setUser(null);
    }
}, {
    immediate: true,
});*/

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

    if (policy.value.accepted && policy.value.rum) {
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
            class: [`theme-${ store.theme ?? 'default' }`, store.config.hideHeader ? `iframe` : ''],
        },
        style: [{
            key: 'radarStyles',
            innerHTML: `:root {${ css }}`,
        }],
        script,
    };
});

let parser: UAParser | undefined;

async function getDeviceType(uaParser = parser) {
    if (!uaParser) return;
    const type = (await uaParser.getDevice().withFeatureCheck()).type;
    let parsedType: 'desktop' | 'tablet' | 'mobile' = 'desktop';

    switch (type) {
        case 'mobile':
        case 'wearable':
            parsedType = 'mobile';
            break;
        case 'tablet':
            parsedType = 'tablet';
            break;
    }

    return parsedType;
}

async function getEngine(uaParser = parser) {
    if (!uaParser) return;
    return (await uaParser.getEngine().withFeatureCheck()).name;
}

function setWindowStore() {
    store.isMobile = window.innerWidth < 700;
    store.isMobileOrTablet = window.innerWidth < 1466;
    store.isTablet = window.innerWidth < 1466 && window.innerWidth >= 700;
    store.isPC = window.innerWidth >= 1466;
    store.isPCWide = window.innerWidth >= 1900;
    store.scrollbarWidth = window.innerWidth - document.documentElement.offsetWidth;
    store.viewport.width = window.innerWidth;
}

const listener = () => {
    setWindowStore();
};

let windowInterval: NodeJS.Timeout | undefined;

onNuxtReady(async () => {
    document.addEventListener('resize', listener);
    parser = new UAParser(navigator.userAgent);

    setWindowStore();
    windowInterval = setInterval(setWindowStore, 500);
    store.device = await getDeviceType() ?? 'desktop';
    store.engine = await getEngine();
    store.touch = matchMedia('(hover: none)').matches;
});

onBeforeUnmount(() => {
    document.removeEventListener('resize', listener);
    clearInterval(windowInterval);
});

const headers = useRequestHeaders(['user-agent']);

await useAsyncData('default-init', async () => {
    if (headers?.['user-agent'] && import.meta.server) {
        const browser = new UAParser(headers['user-agent'] || '');
        const type = browser.getDevice().type;
        let parsedType: 'tablet' | 'mobile' | undefined;

        switch (type) {
            case 'mobile':
            case 'wearable':
                parsedType = 'mobile';
                break;
            case 'tablet':
                parsedType = 'tablet';
                break;
        }

        store.isMobile = parsedType === 'mobile';
        store.isTablet = parsedType === 'tablet';
        store.isMobileOrTablet = store.isMobile || store.isTablet;
        store.isPC = !store.isMobile && !store.isTablet;
        store.isPCWide = !store.isMobile && !store.isTablet;
        store.device = await getDeviceType() ?? 'desktop';
        store.engine = await getEngine();
    }

    return true;
});
</script>

<style lang="scss" scoped>
.app_content {
    padding: 0 8px;
}

.app_footer {
    display: flex;
    flex-direction: column;
    padding: 8px 0;

    &_info {
        display: flex;
        gap: 8px;
        align-self: flex-end;

        padding: 0 10px;

        font-size: 13px;

        opacity: 0.5;

        &, * {
            color: $lightGray500;
            text-decoration-skip-ink: none;
        }
    }
}
</style>

<style lang="scss">
@use '../scss/fonts';

html, body {
    width: 100%;
    min-height: 100%;
    margin: 0;
    padding: 0;

    font-family: $defaultFont;
    color: $lightGray500;
    text-size-adjust: 100%;

    color-scheme: dark;
    background: $black;

    -webkit-tap-highlight-color: transparent;

    &:not(.iframe) {
        scrollbar-gutter: stable;
    }

    &.theme-light {
        &, * {
            color-scheme: light;
        }
    }
}

html, body, #__app, #__app > .app, #__app > .app > .app_content {
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
}

svg, img {
    display: block;
}

img {
    max-width: 100%;
}

*,
*::before,
*::after {
    scrollbar-color: $darkGray200 var(--bg-color, $black);
    scrollbar-width: thin;
    box-sizing: border-box;
}

* {
    &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
        appearance: none;
    }

    &::-webkit-scrollbar-thumb {
        border: 3px solid var(--bg-color, $black);
        border-radius: 10px;
        background: $darkGray200;
    }

    &::-webkit-scrollbar-track {
        background: var(--bg-color, $black);
    }
}

.__info-sections {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_title {
        padding-top: 8px;
        border-top: 1px solid $whiteAlpha12;
        font-size: 13px;
        font-weight: 600;
    }

    &--gap-16 {
        gap: 16px;
    }
}

.__vertical-group-4 {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.__horizontal-group-4 {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.__vertical-group-16 {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.__grid-info-sections {
    display: grid;
    grid-template-columns: 20% 75%;
    align-items: center;
    justify-content: space-between;

    &_title {
        font-size: 13px;
        font-weight: 600;
    }

    &--large-title {
        grid-template-columns: 30% 65%;

        @include mobileOnly {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
        }
    }

    &--reversed {
        grid-template-columns: 75% 20%;

        &.__grid-info-sections--large-title {
            grid-template-columns: 65% 30%;
        }
    }

    &--vertical {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
    }

    &--flex {
        display: flex;
        gap: 8px;
        align-items: center;
    }
}

.__section-group {
    display: flex;
    gap: 8px;
    width: 100%;

    > * {
        flex: 1 1 0;
        width: 0;
    }

    &--even {
        > * {
            flex: unset;
            width: unset;
        }
    }

    @include mobileOnly {
        &--even-mobile, &--disable-mobile {
            > * {
                flex: unset;
                width: unset;
            }
        }

        &--disable-mobile {
            flex-direction: column;

            > * {
                width: 100%;
            }
        }
    }

    &--align-center {
        align-items: center;
    }

    &--even {
        flex-wrap: wrap;

        > * {
            width: auto;
        }
    }

    @include mobileOnly {
        &--even-mobile {
            flex-wrap: wrap;

            > * {
                width: auto;
            }
        }
    }
}

.__small-title {
    font-size: 13px;
    font-weight: 600;
    color: $lightGray500;
}

.__spacer {
    flex: 1 0 auto;
}

.__link {
    color: var(--text-primary-color, #{$blue500});
    text-decoration: underline;

    @include hover {
        transition: 0.3s;

        &:hover {
            color: var(--text-hover-color, #{$blue400});
        }
    }
}

.no-overflow {
    overflow: hidden;
}

@media all and (max-width: 1899px) {
    .__wide {
        display: none !important;
    }
}

@include fromTablet {
    .__mobile {
        display: none !important;
    }
}

@include mobile {
    .__desktop {
        display: none !important;
    }
}

@include mobileOnly {
    .__tablet {
        display: none !important;
    }

    .__from-tablet {
        display: none !important;
    }
}

@include pc {
    .__tablet {
        display: none !important;
    }
}

.__partner-info {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;

    font-size: 14px;

    img {
        width: 56px;
        min-width: 56px;
        max-width: 56px;
    }
}
</style>
