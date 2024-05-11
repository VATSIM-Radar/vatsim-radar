<template>
    <label class="radio" :class="{'radio--checked': model}">
        <input class="radio_input" type="radio" :name="name || id" v-model="model" :checked="!!model">
        <span class="radio_icon"/>
        <span class="radio_text">
            <slot>
                {{ text }}
            </slot>
        </span>
        <span class="radio_spacer"/>
        <common-tooltip class="radio_tooltip" v-if="hint || $slots.hint" :location="hintLocation">
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

const id = useId();

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.radio {
    display: flex;
    align-items: center;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px;

    &--checked {
        cursor: default;
    }

    &_input {
        display: none;
    }

    &_icon {
        width: 16px;
        min-width: 16px;
        height: 16px;
        position: relative;
        background: transparent;
        border: 1px solid $neutral150;
        display: flex;
        justify-content: center;
        align-items: center;

        &, &::before {
            transition: 0.3s;
            border-radius: 100%;
        }

        &::before {
            content: '';
            width: 8px;
            height: 8px;
            background: transparent;
            position: absolute;
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
        color: $primary600;
        min-width: 16px;

        svg {
            width: 16px;
        }
    }
}
</style>
