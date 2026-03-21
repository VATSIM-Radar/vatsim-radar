<template>
    <transition name="popup-block--appear">
        <div
            v-if="show"
            class="popup-block"
            :class="{ 'popup-block--content-aside': asideContent, 'popup-block--open-from': !!openFrom, [`popup-block--open-from-${ openFrom }`]: !!openFrom }"
            :style="{ '--max-height': maxContentHeight ?? 'unset' }"
        >
            <ui-text
                v-if="$slots.title"
                class="popup-block_title"
                type="h5"
            >
                <div class="popup-block_title_text">
                    <slot name="title"/>
                </div>
                <ui-separator
                    v-if="$slots.additionalTitle"
                    distance="-4px"
                />
                <ui-text
                    v-if="$slots.additionalTitle"
                    class="popup-block_title_sub"
                    type="3b"
                >
                    <slot name="additionalTitle"/>
                </ui-text>
                <template v-if="$slots.titleAppend || model !== null">
                    <div class="__spacer"/>
                    <div
                        v-if="$slots.titleAppend"
                        class="popup-block_title_append"
                    >
                        <slot name="titleAppend"/>
                    </div>
                    <div
                        v-if="model !== null"
                        class="popup-block_title_close"
                        @click="model = false"
                    >
                        <close-icon/>
                    </div>
                </template>
            </ui-text>
            <div class="popup-block_content">
                <slot/>
            </div>
        </div>
    </transition>
</template>

<script lang="ts" setup>
import CloseIcon from 'assets/icons/basic/close.svg?component';
import UiText from '~/components/ui/text/UiText.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import type { Positioning } from 'ol/Overlay';

defineProps({
    width: {
        type: String,
        default: 'auto',
    },
    contentPadding: {
        type: String,
        default: '8px',
    },
    asideContent: {
        type: Boolean,
        default: false,
    },
    maxContentHeight: {
        type: String as PropType<string | null>,
        default: null,
    },
    openFrom: {
        type: String as PropType<Positioning | null>,
        default: null,
    },
});

defineSlots<{
    default: () => any;
    title: () => any;
    additionalTitle: () => any;
    titleAppend: () => any;
}>();

const model = defineModel({ type: Boolean as PropType<boolean | null>, default: null });
const show = ref(false);

// So animation can work
onMounted(() => {
    watch(model, () => {
        show.value = model.value !== false;
    }, {
        immediate: true,
    });
});
</script>

<style scoped lang="scss">
.popup-block {
    position: relative;
    border: 1px solid $strokeDefault;
    border-radius: 8px;
    background: $black;

    &_title {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        align-items: center;

        padding: 8px;
        border-bottom: 1px solid $strokeDefault;

        color: $lightGray200;

        .__spacer {
            margin: 0 -16px;
        }

        &_close {
            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 20px;
            height: 20px;

            svg {
                width: 12px;
            }

            @include hover {
                transition: 0.3s;

                &:hover {
                    color: $red500;
                }
            }
        }
    }

    &--content-aside {
        padding-bottom: 16px;

        .popup-block_title {
            border-top: 0;
        }
    }

    &, &_content {
        display: flex;
        flex-direction: column;
    }

    &_content {
        overflow: auto;
        width: v-bind(width);
        max-height: var(--max-height);
        padding: v-bind(contentPadding);
    }

    &--open-from {
        &.popup-block--appear {
            &-enter-active,
            &-leave-active {
                inset: 0;
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                opacity: 0;

                @include mobileOnly {
                    top: -5px;
                }

                @include fromTablet {
                    &[class*=' popup-block--open-from-top'] {
                        top: -5px;
                    }

                    &[class*=' popup-block--open-from-bottom'] {
                        top: 5px;
                    }

                    &[class*=' popup-block--open-from-center-right'] {
                        left: 5px;
                    }

                    &[class*=' popup-block--open-from-center-left'] {
                        left: -5px;
                    }
                }
            }
        }
    }
}
</style>
