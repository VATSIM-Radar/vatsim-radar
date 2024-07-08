<template>
    <div
        class="info-block"
        :class="{ 'info-block--button': isButton }"
        :style="{ '--text-align': textAlign }"
    >
        <div
            v-if="$slots.top || topItems.filter(x => !!x).length"
            class="info-block_top"
            :style="{ justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }"
        >
            <template v-if="topItems.length">
                <template
                    v-for="(item, index) in topItems.filter(x => !!x)"
                    :key="String(item)+index"
                >
                    <div
                        v-if="index > 0"
                        class="info-block__separator"
                    >
                        <ellipse-icon/>
                    </div>
                    <div class="info-block__content">
                        <slot
                            v-if="$slots.top"
                            :index="index"
                            :item="item"
                            name="top"
                        />
                        <template v-else>
                            {{ item }}
                        </template>
                    </div>
                </template>
            </template>
            <div
                v-else
                class="info-block__content"
            >
                <slot name="top"/>
            </div>
        </div>
        <div
            v-if="$slots.bottom || bottomItems.filter(x => !!x).length"
            class="info-block_bottom"
            :style="{ justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }"
        >
            <template v-if="bottomItems.length">
                <template
                    v-for="(item, index) in bottomItems.filter(x => !!x)"
                    :key="String(item)+index"
                >
                    <div
                        v-if="index > 0"
                        class="info-block__separator"
                    >
                        <ellipse-icon/>
                    </div>
                    <div class="info-block__content">
                        <slot
                            v-if="$slots.bottom"
                            :index="index"
                            :item="item"
                            name="bottom"
                        />
                        <template v-else>
                            {{ item }}
                        </template>
                    </div>
                </template>
            </template>
            <div
                v-else
                class="info-block__content"
            >
                <slot name="bottom"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import EllipseIcon from 'assets/icons/basic/ellipse.svg?component';

defineProps({
    textAlign: {
        type: String as PropType<'left' | 'center' | 'right'>,
        default: 'left',
    },
    topItems: {
        type: Array as PropType<Array<string | number | null | undefined>>,
        default: () => [],
    },
    bottomItems: {
        type: Array as PropType<Array<string | number | null | undefined>>,
        default: () => [],
    },
    isButton: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    top(props: { item?: string | number | null | undefined; index?: number }): any;
    bottom(props: { item?: string | number | null | undefined; index?: number }): any;
}>();
</script>

<style scoped lang="scss">
.info-block {
    display: flex;
    flex-direction: column;
    gap: 4px;

    padding: 8px;

    font-size: 12px;
    font-weight: 400;
    text-align: var(--text-align);

    background: $darkgray950;
    border-radius: 4px;

    transition: 0.3s;

    &--button {
        cursor: pointer;
        background: $darkgray900;

        @include hover {
            &:hover {
                background: $darkgray850;
            }
        }
    }

    &_top {
        font-weight: 600;
    }

    &_top, &_bottom {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 8px;
        align-items: center;
        justify-content: flex-start;

        > *:only-child {
            width: 100%;
        }
    }

    &__separator {
        width: 4px;
        min-width: 4px;
        color: varToRgba('lightgray150', 0.5);
    }
}
</style>
