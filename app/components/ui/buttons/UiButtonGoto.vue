<template>
    <ui-button
        class="button-goto"
        disable-text-decoration
        :hover-color
        :link-color="color"
        v-bind="buttonOptions"
        :text-type
        type="link"
    >
        <slot/>

        <template #append>
            <arrow-top-icon class="button-goto_icon" width="12"/>
        </template>
    </ui-button>
</template>

<script setup lang="ts">
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import type { ColorsList } from '~/utils/colors.ts';
import type { ButtonOptions } from './UiButton.vue';
import type { PropType } from 'vue';

defineProps({
    color: {
        type: String as PropType<ColorsList>,
        default: 'lightGray900',
    },
    hoverColor: {
        type: String as PropType<ColorsList>,
        default: 'white',
    },
    buttonOptions: {
        type: Object as PropType<ButtonOptions>,
    },
    textType: {
        type: String as PropType<UiTextTypes>,
        default: '1b',
    },
});

defineSlots<{ default?: () => any }>();
</script>

<style scoped lang="scss">
.button-goto {
    align-self: flex-start;

    &_icon {
        transform: rotate(90deg);
    }

    &:hover {
        gap: 16px;
    }
}
</style>
