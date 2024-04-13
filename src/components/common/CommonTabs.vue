<template>
    <div class="tabs">
        <div
            class="tabs_tab"
            :class="{'tabs_tab--active': key === model}"
            v-for="(tab, key) in tabs"
            :key="key"
            @click="model = key"
        >
            {{ tab.title }}
        </div>
        <div class="tabs_content" v-if="model && $slots[model]">
            <slot :name="model as any"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

interface Tab {
    title: string;
}

const props = defineProps({
    tabs: {
        type: Object as PropType<Record<string, Tab>>,
        required: true,
    },
});

defineSlots<{
    [key: string]: () => any
}>();

const model = defineModel({ type: String });
// eslint-disable-next-line vue/no-setup-props-reactivity-loss,vue/no-ref-object-reactivity-loss
if (!model.value) model.value = Object.keys(props.tabs)[0];
</script>

<style scoped lang="scss">
.tabs {
    display: flex;
    width: 100%;

    &_tab {
        width: 100%;
        background: $neutral1000;
        padding: 8px;
        border-radius: 4px;
        font-size: 14px;
        font-family: $openSansFont;
        font-weight: 400;
        color: $neutral150;
        transition: 0.3s;
        position: relative;
        cursor: pointer;
        text-align: center;
        user-select: none;
        display: flex;
        justify-content: center;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            transition: 0.3s;
            height: 2px;
            background: $neutral850;
            border-radius: 4px;
            width: 30%;
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
            background: $neutral950;
            cursor: default;

            &::after {
                width: 75%;
                background: $primary500;
            }
        }
    }
}
</style>
