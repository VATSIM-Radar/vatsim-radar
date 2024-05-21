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
        <span class="radio_text">
            <slot>
                {{ text }}
            </slot>
        </span>
        <span class="radio_spacer"/>
        <common-tooltip
            v-if="hint || $slots.hint"
            class="radio_tooltip"
            :location="hintLocation"
        >
            <template #activator>
                <div class="radio__hint">
                    <question-icon/>
                </div>
            </template>
            <slot name="hint">
                {{ hint }}
            </slot>
        </common-tooltip>
    </label>
</template>

<script setup lang="ts">
import type { TooltipLocation } from '~/components/common/CommonTooltip.vue';
import QuestionIcon from '@/assets/icons/basic/question.svg?component';

export interface RadioItem<T extends string | number | null = string | number | null> {
    value: T;
    text?: string;
    hint?: string;
    hintLocation?: TooltipLocation;
}

defineProps<RadioItem & { name?: string }>();

defineSlots<{ default(): any; hint(): any }>();

const id = useId();

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.radio {
    cursor: pointer;

    display: flex;
    align-items: center;

    padding: 4px;

    font-size: 12px;
    font-weight: 600;
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

        width: 16px;
        min-width: 16px;
        height: 16px;

        background: transparent;
        border: 1px solid $neutral150;

        &, &::before {
            border-radius: 100%;
            transition: 0.3s;
        }

        &::before {
            content: '';

            position: absolute;

            width: 8px;
            height: 8px;

            background: transparent;
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
            background: $neutral50Orig;
            border-color: $primary500;

            &::before {
                background: $primary500;
            }
        }
    }

    &__hint {
        min-width: 16px;
        color: $primary600;

        svg {
            width: 16px;
        }
    }
}
</style>
