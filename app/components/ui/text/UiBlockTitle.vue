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
        <ui-text
            class="title_text"
            type="2b"
        >
            <div
                v-if="$slots.bubble || bubble"
                class="title_text_bubble"
            >
                <slot name="bubble">
                    <ui-bubble
                        v-if="$slots.bubble || bubble"
                    >
                        {{ bubble }}
                    </ui-bubble>
                </slot>
            </div>
            <div class="title_text_content">
                <slot/>
            </div>
        </ui-text>
        <ui-separator
            class="title_separator"
            distance="0"
            full
            horizontal
        />
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
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiText from '~/components/ui/text/UiText.vue';

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
    gap: 8px;
    align-items: center;
    justify-content: space-between;

    &:not(:only-child, &--remove-margin) {
        margin-bottom: 8px;
    }

    &_text {
        display: flex;
        gap: 8px;
        font-weight: 600;
    }

    &_separator {
        flex-grow: 1;
    }

    &_collapse {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;

        svg {
            width: 12px;
            transition: 0.3s;
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

    @include hover {
        &:hover {
            .title_collapse {
                color: $blue500;
            }
        }
    }
}
</style>
