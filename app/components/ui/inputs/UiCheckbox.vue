<template>
    <div
        class="checkbox"
        :class="{ 'checkbox--checked': checked, 'checkbox--revert': revert }"
        @click="checked = !checked"
    >
        <div class="checkbox_icon">
            <check-icon/>
        </div>
        <div class="checkbox_text">
            <slot/>
        </div>
    </div>
</template>

<script setup lang="ts">
import CheckIcon from '~/assets/icons/kit/check.svg?component';

defineProps({
    revert: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default: () => any }>();

const checked = defineModel({ type: Boolean, required: true });
</script>

<style scoped lang="scss">
.checkbox {
    cursor: pointer;
    user-select: none;

    display: flex;
    gap: 16px;
    align-items: center;

    font-family: $defaultFont;
    font-size: 12px;
    font-weight: 600;
    line-height: 100%;

    &--revert {
        flex-direction: row-reverse;
    }

    &_icon {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 16px;
        height: 16px;
        border: 1px solid $lightgray100;
        border-radius: 4px;

        transition: 0.3s;

        svg {
            transform: scale(0);
            width: 10px;
            transition: 0.3s;
        }
    }

    &--checked .checkbox {
        &_icon {
            border-color: $primary500;
            background: $primary500;

            svg {
                transform: scale(1);
                color: $lightgray150Orig;
            }
        }
    }
}
</style>
