<template>
    <div
        v-if="!hadRestrictedAuth"
        class="app"
    >
        <view-header v-if="!store.config.hideHeader"/>
        <div class="app_content">
            <client-only>
                <view-update-popup v-if="!hasObs()"/>
            </client-only>
            <nuxt-loading-indicator color="rgb(var(--primary500))"/>
            <slot/>
        </div>
        <common-popup
            v-if="store.updateRequired"
            v-model="updateRequired"
        >
            <template #title>Page Reload Needed</template>

            A new VATSIM Radar update is available! Please reload the page to apply the update.

            <template #actions>
                <common-button
                    type="secondary"
                    @click="updateRequired = false"
                >
                    Negative, I'll pass
                </common-button>
                <common-button @click="reload">
                    Wilco, reload page
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
                <nuxt-link
                    no-prefetch
                    to="/privacy-policy"
                >
                    Privacy Policy
                </nuxt-link>
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
import ViewHeader from '~/components/views/ViewHeader.vue';
import ViewMapFooter from '~/components/views/ViewMapFooter.vue';
import { setUserLocalSettings } from '~/composables';
import { checkAndSetMapPreset } from '~/composables/presets';
import RestrictedAuth from '~/components/views/RestrictedAuth.vue';

import type { ThemesList } from '~/utils/backend/styles';
import ViewUpdatePopup from '~/components/views/ViewUpdatePopup.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';

defineSlots<{ default: () => any }>();

const store = useStore();
const route = useRoute();
const updateRequired = ref(true);

const reload = () => location.reload();

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
    const interval = setInterval(() => {
        store.datetime = Date.now();
    }, 1000);

    const handleStorageUpdate = () => {
        setUserLocalSettings();
    };

    window.addEventListener('storage', handleStorageUpdate);

    onBeforeUnmount(() => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageUpdate);
    });
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

    return {
        titleTemplate(title) {
            if (!title) return 'VATSIM Radar';
            return `${ title } | VATSIM Radar`;
        },
        meta: [
            {
                name: 'description',
                content: 'Explore VATSIM Network, track pilots, view ATC - and more!',
            },
            {
                name: 'keywords',
                content: 'vatsim, vatspy, simaware, vatglasses, ватсим, vatsim traffic, vatsim tracker',
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

    color-scheme: dark;
    background: $darkgray1000;

    &:not(.iframe){
        scrollbar-gutter: stable;
    }

    &--theme-light {
        color-scheme: light;
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
        background: $darkgray800;
        border: 3px solid var(--bg-color, $darkgray1000);
        border-radius: 10px;
    }

    &::-webkit-scrollbar-track {
        background: var(--bg-color, $darkgray1000);
    }
}

.__info-sections {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &_title {
        padding-top: 8px;
        font-size: 13px;
        font-weight: 600;
        border-top: 1px solid varToRgba('lightgray150', 0.15);
    }
}

.__grid-info-sections {
    display: grid;
    grid-template-columns: 20% 75%;
    align-items: center;
    justify-content: space-between;

    &_title {
        font-size: 13px;
    }
}

.__section-group {
    display: flex;
    gap: 8px;
    width: 100%;

    &:not(&--even){
        > * {
            flex: 1 1 0;
            width: 0;
        }
    }

    &--even {
        flex-wrap: wrap;

        > * {
            width: auto;
        }
    }
}

.__spacer {
    flex: 1 0 auto;
}

.__link {
    color: $primary500;
    text-decoration: underline;
}
</style>
