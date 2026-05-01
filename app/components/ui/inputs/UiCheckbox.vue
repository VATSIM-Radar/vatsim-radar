<template>
    <div
        class="checkbox"
        :class="{ 'checkbox--checked': checked, 'checkbox--revert': revert, 'checkbox--disabled': disabled }"
        @click="checked = !checked"
    >
        <div class="checkbox_icon">
            <check-icon/>
        </div>
        <ui-text
            v-if="$slots.default"
            class="checkbox_text"
            type="2b-medium"
        >
            <slot/>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import CheckIcon from '~/assets/icons/kit/check.svg?component';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    revert: {
        type: Boolean,
        default: false,
    },
    disabled: {
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
    gap: 24px;
    align-items: center;

    &--revert {
        flex-direction: row-reverse;
    }

    &_icon {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 20px;
        height: 20px;
        border: 1px solid $strokeDefault;
        border-radius: 4px;

        @include boxShadowActiveProp(transparent);

        transition: 0.3s;

        svg {
            transform: scale(0);
            width: 10px;
            transition: 0.3s;
        }
    }

    @include hover {
        &:hover .checkbox_icon {
            border-color: $darkGray100;
        }

        &:active .checkbox_icon {
            @include boxShadowActiveProp;
        }
    }

    &--checked .checkbox {
        &_icon {
            border-color: $brandPrimaryStroke;
            color: $lightGray400Orig;
            background: $brandPrimaryStroke;

            svg {
                transform: scale(1);
            }
        }

        @include hover {
            &:hover .checkbox_icon {
                border-color: $brandPrimary;
            }
        }
    }

    &--disabled {
        pointer-events: none;
        cursor: default;

        .checkbox_icon {
            border-color: $whiteAlpha2;
            color: $whiteAlpha24;
            background: $darkGray900;
        }
    }
}
</style>
