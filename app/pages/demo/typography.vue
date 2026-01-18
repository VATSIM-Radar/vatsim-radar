<template>
    <ui-page-container>
        <template #title>
            Typography
        </template>
        <ui-text
            v-for="(_, type) in types"
            :key="type"
            :type
        >
            Lorem ipsum
        </ui-text>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';

const types: Record<UiTextTypes, true> = {
    '1b': true,
    '2b': true,
    '2b-medium': true,
    '3b': true,
    '3b-medium': true,
    '3b-medium-alt': true,
    'caption-light': true,
    'caption-medium': true,
    'caption-medium-alt': true,
    'h6-upper': true,
    caption: true,
    h1: true,
    h2: true,
    h3: true,
    h4: true,
    h5: true,

};
</script>
