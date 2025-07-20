<template>
    <div
        class="title"
        :class="{
            'title--collapsed': collapsed,
            'title--collapsible': collapsed !== null,
            'title--remove-margin': removeMargin,
        }"
        @click="collapsed !== null ? collapsed = !collapsed : undefined"
    >
        <div class="title_text">
            <div
                v-if="$slots.bubble || bubble"
                class="title_text_bubble"
            >
                <slot name="bubble">
                    <common-blue-bubble
                        v-if="$slots.bubble || bubble"
                    >
                        {{ bubble }}
                    </common-blue-bubble>
                </slot>
            </div>
            <div class="title_text_content">
                <slot/>
            </div>
        </div>
        <div
            v-if="$slots.append"
            class="title_append"
        >
            <slot name="append"/>
        </div>
        <div
            v-if="collapsed !== null"
            class="title_collapse"
        >
            <arrow-top-icon width="14"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';

defineProps({
    bubble: {
        type: [String, Number],
    },
    removeMargin: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    default?(): any;
    bubble?(): any;
    append?(): any;
}>();

const collapsed = defineModel<boolean | null>('collapsed', {
    default: null,
});
</script>

<style scoped lang="scss">
.title {
    user-select: none;

    position: relative;
    z-index: 0;

    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    &::before {
        content: '';

        position: absolute;

        width: 100%;
        height: 1px;

        background: $darkgray850;
    }

    &:not(:only-child, &--remove-margin) {
        margin-bottom: 16px;
    }

    &_text > *, &_collapse, &_append {
        position: relative;
        z-index: 1;
        background: var(--block-title-background, $darkgray1000);
    }

    &_text {
        display: flex;
        gap: 16px;

        padding-left: 8px;
        border-radius: 4px;

        font-size: 14px;
        font-weight: 600;

        &_content {
            padding: 0 4px;
        }
    }

    &_collapse {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 44px;
        height: 24px;

        svg {
            transition: 0.3s;
        }

        @include hover {
            &:hover {
                svg {
                    color: $primary500;
                }
            }
        }
    }

    &--collapsed .title {
        &_collapse svg {
            transform: rotate(180deg);
        }
    }

    &--collapsible {
        cursor: pointer;
    }
}
</style>
