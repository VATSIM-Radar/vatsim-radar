<template>
    <div class="app">
        <view-header/>
        <div class="app_content">
            <slot/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import ViewHeader from '~/components/views/ViewHeader.vue';

const store = useStore();

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

svg,img {
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
