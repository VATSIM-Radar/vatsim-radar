<template>
    <label
        class="radio"
        :class="{ 'radio--checked': model }"
    >
        <input
            v-model="model"
            :checked="!!model"
            class="radio_input"
            :name="name || id"
            type="radio"
        >
        <span class="radio_icon"/>
        <ui-text
            class="radio_text"
            tag="span"
            type="2b-medium"
        >
            <slot>
                {{ text || value }}
            </slot>
        </ui-text>
        <span class="radio_spacer"/>
        <ui-tooltip
            v-if="hint || $slots.hint"
            class="radio_tooltip"
            :location="hintLocation"
            width="max-content"
        >
            <template #activator>
                <div class="radio__hint">
                    <question-icon/>
                </div>
            </template>
            <slot name="hint">
                <span v-html="hint"/>
            </slot>
        </ui-tooltip>
    </label>
</template>

<script setup lang="ts">
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';
import QuestionIcon from 'assets/icons/basic/question.svg?component';
import UiText from '~/components/ui/text/UiText.vue';

export interface RadioItem<T extends string | number | boolean | null = string | number | boolean | null> {
    value: T;
    text?: string;
    hint?: string;
    hintLocation?: TooltipLocation;
}

defineProps<RadioItem & { name?: string }>();

defineSlots<{ default?(): any; hint?(): any }>();

const id = useId();

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.radio {
    cursor: pointer;
    user-select: none;

    display: flex;
    align-items: center;

    text-align: left;

    &--checked {
        cursor: default;
    }

    &_input {
        display: none;
    }

    &_icon {
        position: relative;

        display: flex;
        align-items: center;
        justify-content: center;

        width: 20px;
        min-width: 20px;
        height: 20px;
        border: 1px solid $strokeDefault;

        background: $darkGray700;

        transition: 0.3s;
        @include boxShadowActiveProp(transparent);

        &::before {
            content: '';

            position: absolute;

            width: 12px;
            height: 12px;

            background: transparent;
        }

        &, &::before {
            border-radius: 100%;
            transition: 0.3s;
        }
    }

    &_text, &_tooltip {
        margin-left: 16px;
    }

    &_spacer {
        flex: 1 0 auto;
    }

    &--checked .radio {
        &_icon {
            border-color: $brandPrimaryStroke;

            &::before {
                background: $brandPrimaryStroke;
            }
        }
    }

    &__hint {
        display: flex;
        align-items: center;
        justify-content: center;

        min-width: 16px;

        color: $primary600;

        svg {
            width: 16px;
        }
    }

    @include hover {
        &:hover {
            .radio_icon {
                border-color: $darkGray100;
            }

            &.radio--checked .radio_icon {
                border-color: $brandPrimary;
            }
        }

        &:active .radio_icon {
            @include boxShadowActiveProp;
        }
    }
}
</style>
