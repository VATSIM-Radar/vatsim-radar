<template>
    <div
        v-if="!hadRestrictedAuth"
        class="app"
    >
        <nuxt-pwa-manifest/>
        <view-header v-if="!store.config.hideHeader"/>
        <div class="app_content">
            <client-only>
                <view-update-popup v-if="!hasObs()"/>
            </client-only>
            <nuxt-loading-indicator color="rgb(var(--primary500))"/>
            <slot/>
        </div>
        <common-popup
            v-if="store.updateRequired || $pwa?.needRefresh"
            v-model="updateRequired"
            disabled
        >
            <template #title>Page Reload Needed</template>

            A new VATSIM Radar update is available! Please reload the page to apply the update.

            <template #actions>
                <common-button @click="reload">
                    Apply and reload
                </common-button>
            </template>
        </common-popup>
        <div
            v-if="!store.config.hideFooter"
            class="app_footer"
        >
            <view-map-footer v-if="route.path === '/'"/>
            <div
                v-else
                class="app_footer_info"
            >
                <div v-if="store.version">
                    v{{ store.version }}
                </div>
            </div>
        </div>
    </div>
    <restricted-auth
        v-else
        v-once
    />
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import ViewHeader from '~/components/views/header/ViewHeader.vue';
import ViewMapFooter from '~/components/views/ViewMapFooter.vue';
import { checkAndSetMapPreset } from '~/composables/presets';
import RestrictedAuth from '~/components/views/RestrictedAuth.vue';

import type { ThemesList } from '~/utils/backend/styles';
import ViewUpdatePopup from '~/components/views/ViewUpdatePopup.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { UAParser } from 'ua-parser-js';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';

defineSlots<{ default: () => any }>();

const store = useStore();
const route = useRoute();
const updateRequired = ref(true);
const { $pwa } = useNuxtApp();

const reload = () => {
    if ($pwa?.needRefresh) $pwa.updateServiceWorker();
    else location.reload();
};

const theme = useCookie<ThemesList>('theme', {
    path: '/',
    sameSite: 'lax',
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
});

useHead(() => {
    const theme = store.theme ?? 'default';
    const css = Object
        .entries({
            ...radarColors,
            ...(theme === 'default' ? {} : radarThemes[theme]),
        })
        .filter(([key]) => key.endsWith('Rgb'))
        .map(([key, value]) => `--${ key.replace('Rgb', '') }: ${ (value as number[]).join(',') }`)
        .join(';');

    const themeColor = getCurrentThemeHexColor('darkgray1000');

    return {
        titleTemplate(title) {
            if (!title) return 'VATSIM Radar';
            return `${ title } | VATSIM Radar`;
        },
        meta: [
            {
                name: 'description',
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
    store.isMobileOrTablet = window.innerWidth < 1366;
    store.isTablet = window.innerWidth < 1366 && window.innerWidth >= 700;
    store.isPC = window.innerWidth >= 1366;
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
            color: $lightgray150;
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
    color: $lightgray150;
    text-size-adjust: 100%;

    color-scheme: dark;
    background: $darkgray1000;

    &:not(.iframe){
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
    scrollbar-color: $darkgray800 var(--bg-color, $darkgray1000);
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
        border: 3px solid var(--bg-color, $darkgray1000);
        border-radius: 10px;
        background: $darkgray800;
    }

    &::-webkit-scrollbar-track {
        background: var(--bg-color, $darkgray1000);
    }
}

.__info-sections {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_title {
        padding-top: 8px;
        border-top: 1px solid varToRgba('lightgray150', 0.15);
        font-size: 13px;
        font-weight: 600;
    }

    &--gap-16 {
        gap: 16px;
    }
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
}

.__section-group {
    display: flex;
    gap: 8px;
    width: 100%;

    >*{
        flex: 1 1 0;
        width: 0;
    }

    &--even {
        >* {
            flex: unset;
            width: unset;
        }
    }

    @include mobileOnly {
        &--even-mobile, &--disable-mobile {
            >* {
                flex: unset;
                width: unset;
            }
        }

        &--disable-mobile {
            flex-direction: column;

            >* {
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
    color: $lightgray150;
}

.__spacer {
    flex: 1 0 auto;
}

.__link {
    color: $primary500;
    text-decoration: underline;

    @include hover {
        transition: 0.3s;

        &:hover {
            color: $primary400;
        }
    }
}

.no-overflow {
    overflow: hidden;
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
