<template>
    <div class="app">
        <view-header v-if="!store.config.hideHeader"/>
        <div class="app_content">
            <slot/>
        </div>
        <div class="app_footer" v-if="!store.config.hideFooter">
            <view-map-footer v-if="route.path === '/'"/>
            <div class="app_footer_info" v-else>
                <nuxt-link no-prefetch to="/privacy-policy">
                    Privacy Policy
                </nuxt-link>
                <div v-if="store.version">
                    v{{ store.version }}
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import ViewHeader from '~/components/views/ViewHeader.vue';
import ViewMapFooter from '~/components/views/ViewMapFooter.vue';
import { setUserLocalSettings } from '~/composables';
import { checkAndSetMapPreset } from '~/composables/presets';

const store = useStore();
const route = useRoute();

checkAndSetMapPreset();

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
            if (!title) return 'Vatsim Radar';
            return `${ title } | Vatsim Radar`;
        },
        meta: [
            {
                name: 'description',
                content: 'Explore Vatsim Network, track pilots, view ATC - and more!',
            },
            {
                name: 'keywords',
                content: 'vatsim, vatspy, simaware, vatglasses, ватсим, vatsim traffic, vatsim tracker',
            },
        ],
        htmlAttrs: {
            lang: 'en',
            class: [`theme-${ store.theme ?? 'default' }`],
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
    padding: 8px 0;
    display: flex;
    flex-direction: column;

    &_info {
        display: flex;
        gap: 8px;
        opacity: 0.5;
        align-self: flex-end;
        padding: 0 10px;
        font-size: 13px;

        &, * {
            color: $neutral150;
            text-decoration-skip-ink: none;
        }
    }
}
</style>

<style lang="scss">
@use '../scss/fonts';

html, body {
    padding: 0;
    margin: 0;
    font-family: $defaultFont;
    color: $neutral150;
    width: 100%;
    min-height: 100%;
    background: $neutral1000;
    scrollbar-gutter: stable;
    color-scheme: dark;

    &--theme-light {
        color-scheme: light;
    }
}

html, body, #__app, #__app > .app, #__app > .app > .app_content {
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
}

svg, img {
    display: block;
}

*,
*::before,
*::after {
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: $neutral800 var(--bg-color, $neutral1000);
}

* {
    &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
        appearance: none;
    }

    &::-webkit-scrollbar-thumb {
        background: $neutral800;
        border-radius: 10px;
        border: 3px solid var(--bg-color, $neutral1000);
    }

    &::-webkit-scrollbar-track {
        background: var(--bg-color, $neutral1000);
    }
}
</style>
