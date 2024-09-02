<template>
    <div class="tabs">
        <div class="tabs_list">
            <div
                v-for="(tab, key) in tabs"
                :key="key"
                class="tabs_tab"
                :class="{
                    'tabs_tab--active': key === model,
                    'tabs_tab--disabled': tab.disabled,
                }"
                @click="model = key"
            >
                {{ tab.title }}
            </div>
        </div>
        <div
            v-if="model && $slots[model]"
            class="tabs_content"
        >
            <slot :name="model as any"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

interface Tab {
    title: string;
    disabled?: boolean;
}

/* eslint vue/require-explicit-slots: 0 */

const props = defineProps({
    tabs: {
        type: Object as PropType<Record<string, Tab>>,
        required: true,
    },
});

defineSlots<{
    [key: string]: () => any;
}>();

const model = defineModel({ type: String });
// eslint-disable-next-line vue/no-setup-props-reactivity-loss,vue/no-ref-object-reactivity-loss
if (!model.value) model.value = Object.keys(props.tabs)[0];
</script>

<style scoped lang="scss">
.tabs {
    width: 100%;

    &_list {
        display: flex;
        gap: 16px;
        align-items: flex-end;

        height: 40px;
        padding: 0 24px;

        background: $darkgray1000;
        border-bottom: 2px solid $primary700;
    }

    &_tab {
        cursor: pointer;
        user-select: none;

        position: relative;

        display: flex;
        flex: 1 1 0;
        align-items: flex-end;
        justify-content: center;

        width: 0;
        height: 32px;
        margin-bottom: -2px;
        padding-bottom: 10px;

        font-family: $defaultFont;
        font-size: 14px;
        font-weight: 600;
        line-height: 100%;
        color: $lightgray125;
        text-align: center;

        border: solid transparent;
        border-width: 2px 2px 0;
        border-radius: 4px;

        transition: 0.3s;

        &::after {
            content: '';

            position: absolute;
            bottom: 0;

            width: 0;
            height: 2px;

            background: $darkgray1000;

            transition: 0.3s;
        }

        @include hover {
            &:not(&--active):hover {
                &::after {
                    width: 50%;
                }
            }
        }

        &--active {
            cursor: default;

            height: 40px;

            color: $primary500;

            border-color: $primary700;
            border-bottom-color: $darkgray1000;

            &::after {
                width: 100%;
            }
        }

        &--disabled {
            pointer-events: none;
            opacity: 0.2;
        }
    }
}
</style>
