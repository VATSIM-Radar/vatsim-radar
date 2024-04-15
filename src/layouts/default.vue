<template>
    <div class="app">
        <view-header/>
        <div class="app_content">
            <slot/>
        </div>
        <div class="app_footer">
            <view-map-footer v-if="route.path === '/'"/>
            <nuxt-link to="/privacy-policy" class="app_footer_policy" v-else>
                Privacy Policy
            </nuxt-link>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import ViewHeader from '~/components/views/ViewHeader.vue';
import ViewMapFooter from '~/components/views/ViewMapFooter.vue';

const store = useStore();
const route = useRoute();

useHead(() => {
    const theme = store.theme;
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

    &_policy {
        display: block;
        color: $neutral150;
        opacity: 0.5;
        align-self: flex-end;
        padding: 0 10px;
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
