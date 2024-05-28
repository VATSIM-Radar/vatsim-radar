<template>
    <div class="tabs">
        <div class="tabs_list">
            <div
                v-for="(tab, key) in tabs"
                :key="key"
                class="tabs_tab"
                :class="{ 'tabs_tab--active': key === model }"
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
        gap: 4px;
    }

    &_tab {
        cursor: pointer;
        user-select: none;

        position: relative;

        display: flex;
        flex: 1 1 0;
        justify-content: center;

        width: 0;
        padding: 8px;

        font-family: $openSansFont;
        font-size: 14px;
        font-weight: 400;
        color: $neutral150;
        text-align: center;

        background: $neutral1000;
        border-radius: 4px;

        transition: 0.3s;

        &::after {
            content: '';

            position: absolute;
            bottom: 0;

            width: 30%;
            height: 2px;

            background: $neutral850;
            border-radius: 4px;

            transition: 0.3s;
        }

        @include hover {
            &:not(&--active):hover {
                &::after {
                    width: 55%;
                    background: $primary500;
                }
            }
        }

        &--active {
            cursor: default;
            background: $neutral950;

            &::after {
                width: 75%;
                background: $primary500;
            }
        }
    }
}
</style>
