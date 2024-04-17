<template>
    <div class="info-block" :class="{'info-block--button': isButton}" :style="{'--text-align': textAlign}">
        <div class="info-block_top" v-if="$slots.top || topItems.length">
            <template v-if="topItems.length">
                <template v-for="(item, index) in topItems.filter(x => !!x)" :key="item">
                    <div class="info-block__separator" v-if="index > 0">
                        <ellipse-icon/>
                    </div>
                    <div class="info-block__content">
                        <slot name="top" :item="item" :index="index" v-if="$slots.top"/>
                        <template v-else>
                            {{ item }}
                        </template>
                    </div>
                </template>
            </template>
            <div class="info-block__content" v-else>
                <slot name="top" />
            </div>
        </div>
        <div class="info-block_bottom" v-if="$slots.bottom || bottomItems.length">
            <template v-if="bottomItems.length">
                <template v-for="(item, index) in bottomItems.filter(x => !!x)" :key="item">
                    <div class="info-block__separator" v-if="index > 0">
                        <ellipse-icon/>
                    </div>
                    <div class="info-block__content">
                        <slot name="bottom" :item="item" :index="index" v-if="$slots.bottom"/>
                        <template v-else>
                            {{ item }}
                        </template>
                    </div>
                </template>
            </template>
            <div class="info-block__content" v-else>
                <slot name="bottom" />
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
        type: Array as PropType<Array<string | null | undefined>>,
        default: () => [],
    },
    bottomItems: {
        type: Array as PropType<Array<string | null | undefined>>,
        default: () => [],
    },
    isButton: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    top(props: {item?: string | null, index?: number}): any
    bottom(props: {item?: string | null, index?: number}): any
}>();
</script>

<style scoped lang="scss">
.info-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: $neutral950;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    transition: 0.3s;
    text-align: var(--text-align);

    &--button {
        background: $neutral900;
        cursor: pointer;

        @include hover {
            &:hover {
                background: $neutral850;
            }
        }
    }

    &_top {
        font-weight: 600;
    }

    &_top, &_bottom {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: wrap;

        >*:only-child {
            width: 100%;
        }
    }

    &__separator {
        color: varToRgba('neutral150', 0.5);
        width: 4px;
        min-width: 4px;
    }
}
</style>
