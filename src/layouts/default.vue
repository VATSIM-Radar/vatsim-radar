<template>
    <div>
        <slot/>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from '~/store';

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

<style lang="scss">
html, body {
    padding: 0;
    margin: 0;
    font-family: Arial, sans-serif;
    color: $neutral150;
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
