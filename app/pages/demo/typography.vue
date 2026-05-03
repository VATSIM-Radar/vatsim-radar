<template>
    <ui-page-container>
        <template #title>
            Typography
        </template>
        <div class="items">
            <ui-text
                v-for="(_, type) in types"
                :key="type"
                :type
            >
                Lorem ipsum ({{type}})
            </ui-text>
            <ui-label>
                Test
            </ui-label>
            <ui-label
                v-for="type in ['L', 'M', 'S', 'XS', null] as any[]"
                :key="type"
                :headline-type="type"
            >
                Test

                <template #tooltip>
                    test
                </template>

                <template #text>
                    Test
                </template>
            </ui-label>
            <ui-label>
                <template #text>
                    Test
                </template>
            </ui-label>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import UiLabel from '~/components/ui/text/UiLabel.vue';

const types: Record<UiTextTypes, true> = {
    h1: true,
    h2: true,
    h3: true,
    h4: true,
    h5: true,
    'h5-upper': true,
    '1b': true,
    '2b': true,
    '2b-medium': true,
    '3b': true,
    '3b-medium': true,
    '3b-medium-alt': true,
    'caption-light': true,
    'caption-medium': true,
    'caption-medium-alt': true,
    caption: true,
};
</script>

<style lang="scss" scoped>
.items {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
</style>
