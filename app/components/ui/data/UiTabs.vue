<template>
    <div
        class="tabs"
        :class="{
            'tabs--vertical': isMobile && mobileVertical,
            'tabs--full-width': fullWidth,
        }"
        :style="{ '--background': radarColors[background as ColorsList] ?? background }"
    >
        <div class="tabs_list">
            <ui-text
                v-for="(tab, key) in tabs"
                :key="key"
                class="tabs_tab"
                :class="{
                    'tabs_tab--active': key === model,
                    'tabs_tab--disabled': tab.disabled,
                }"
                type="2b"
                @click="model = key"
            >
                {{ tab.title }}
            </ui-text>
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
import type { ColorsList } from '~/utils/colors';
import UiText from '~/components/ui/text/UiText.vue';

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
    mobileVertical: {
        type: Boolean,
        default: false,
    },
    fullWidth: {
        type: Boolean,
        default: false,
    },
    background: {
        type: String as PropType<ColorsList | 'transparent'>,
        default: 'black' satisfies ColorsList,
    },
});

defineSlots<{
    [key: string]: () => any;
}>();

const isMobile = useIsMobile();

const model = defineModel({ type: String });
// eslint-disable-next-line vue/no-setup-props-reactivity-loss,vue/no-ref-object-reactivity-loss
if (!model.value) model.value = Object.keys(props.tabs)[0];
</script>

<style scoped lang="scss">
.tabs {
    width: 100%;

    &_list {
        display: flex;
        align-items: flex-end;

        height: 40px;
        padding: 0 16px;
        border-bottom: 1px solid $strokeDefault;

        background: var(--background) !important;

        @at-root .tabs--vertical & {
            flex-direction: column;

            height: auto;
            padding: 0;
            border-bottom: 0;
            border-left: 1px solid $strokeDefault;
        }
    }

    &_tab {
        cursor: pointer;
        user-select: none;

        position: relative;

        display: flex;
        align-items: flex-end;
        justify-content: center;

        height: 100%;
        padding: 8px 16px;

        line-height: 100%;
        color: $typographySecondary;
        text-align: center;

        &::after {
            content: '';

            position: absolute;
            bottom: -1px;

            width: 100%;
            height: 0;
            border-radius: 0 0 100% 100%;

            background: transparent;

            transition: 0.3s;
        }

        @include hover {
            &:not(&--active):hover {
                color: $typographyPrimary;

                &::after {
                    height: 1px;
                    background: varToRgba('blue500', 0.5);
                }
            }
        }

        &--active {
            cursor: default;
            color: $typographyPrimary;

            &::after {
                height: 2px;
                background: $brandPrimaryStroke;
            }
        }

        &--disabled {
            pointer-events: none;
            opacity: 0.2;
        }
    }

    &--full-width .tabs_tab {
        flex: 1 0 auto;
        width: 0;
    }

    &--vertical .tabs_tab {
        width: 100%;

        &::after {
            bottom: 0;
            left: -1px;

            width: 0;
            height: 100% !important;
            border-radius: 0 100% 100% 0;
        }

        @include hover {
            &:hover::after {
                width: 1px;
            }
        }

        &--active::after {
            width: 2px;
        }
    }
}
</style>
