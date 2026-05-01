<template>
    <ui-text
        class="bubble"
        :class="[
            `bubble--size-${ size }`,
            `bubble--type-${ type }`,
        ]"
        :tag="is"
        :type="textType"
    >
        <slot/>
    </ui-text>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';

defineProps({
    size: {
        type: String as PropType<'S' | 'M'>,
        default: 'S',
    },
    type: {
        type: String as PropType<'primary' | 'secondary' | 'primary-flat'>,
        default: 'primary',
    },
    textType: {
        type: String as PropType<UiTextTypes>,
        default: 'caption-medium' satisfies UiTextTypes,
    },
    is: {
        type: String,
        default: 'div',
    },
});

defineSlots<{ default: () => any }>();
</script>

<style scoped lang="scss">
.bubble {
    display: inline-block;

    min-width: 24px;
    padding: 2px 4px;
    border-radius: 4px;

    line-height: 100%;
    color: $typographyPrimaryOrig;
    text-align: center;
    text-decoration: none;

    background: $brandPrimary;

    &--size-M {
        padding: 4px 8px;
    }

    &--type-secondary {
        color: $typographyPrimary;
        background: $darkGray800;
    }

    &--type-primary-flat {
        padding: 0;
        border-radius: 0;
        color: $brandPrimary;
        background: transparent;
    }
}
</style>
