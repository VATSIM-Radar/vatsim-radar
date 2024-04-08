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
</style>
