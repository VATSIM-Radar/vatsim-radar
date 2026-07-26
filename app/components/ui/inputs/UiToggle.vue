<template>
    <div
        class="toggle"
        :class="{ 'toggle--toggled': model, 'toggle--disabled': disabled, 'toggle--align-left': alignLeft }"
        @click="model = !model"
    >
        <div
            v-if="$slots.default"
            class="toggle_label"
        >
            <ui-text
                class="toggle_label_title"
                type="2b-medium"
            >
                <slot/>
            </ui-text>
            <ui-text
                v-if="$slots.description"
                class="toggle_label_description"
                type="caption"
            >
                <slot name="description"/>
            </ui-text>
        </div>
        <div class="toggle_toggler"/>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
    alignLeft: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default?: () => any; description?: () => any }>();

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.toggle {
    cursor: pointer;
    user-select: none;

    display: flex;
    gap: 12px;
    align-items: flex-start;

    min-height: 20px;

    font-family: $defaultFont;

    transition: 0.3s;

    &--disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    &_label {
        width: 100%;
        color: $typographyPrimary;

        &_description {
            margin-top: 4px;
            color: $typographySecondary;
        }
    }

    &--align-left .toggle_label {
        width: auto;
    }

    &_toggler {
        position: relative;

        display: flex;

        width: 36px;
        min-width: 36px;
        height: 20px;
        border: 1px solid $strokeDefault;
        border-radius: 9999px;

        background: $darkGray500;

        transition: 0.3s;

        @include boxShadowActive;

        &::before {
            content: '';

            position: absolute;
            left: 2px;

            align-self: center;

            width: 16px;
            height: 16px;
            border-radius: 9999px;

            background: $lightGray400Orig;

            transition: 0.3s ease-in-out;
        }
    }

    @include hover {
        &:hover .toggle_toggler {
            border-color: $darkGray100;
        }
    }

    &--toggled {
        .toggle_toggler {
            border-color: $brandPrimaryStroke;
            background: $brandPrimaryStroke;

            &::before {
                left: calc(100% - 16px - 2px);
            }
        }

        @include hover {
            &:hover .toggle_toggler {
                border-color: $brandPrimary;
            }
        }
    }
}
</style>
