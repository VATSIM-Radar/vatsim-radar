<template>
    <div
        ref="tooltip"
        class="tooltip"
        :class="[`tooltip--location-${ location }`, `tooltip--align-${ align }`, { 'tooltip--cursor-default': cursorDefault }]"
        @mouseleave="handleMouseLeave"
        @mouseover="handleClick('mouseOver')"
    >
        <div
            class="tooltip_activator"
            tabindex="0"
            @blur="teleported && handleClick('focusOut')"
            @click="handleClick('click')"
            @focus="handleClick('focus')"
            @keydown="handleKeydown"
        >
            <slot name="activator">
                <div class="tooltip_activator_question">
                    <question-icon/>
                </div>
            </slot>
        </div>
        <teleport :disabled="!teleported" to="body">
            <transition name="tooltip_container--appear">
                <div
                    v-if="model"
                    ref="tooltipContainer"
                    class="tooltip_container"
                    :class="{ 'tooltip_container--below': teleported && tooltipPosition?.below }"
                    :style="teleported ? {
                        position: 'fixed',
                        width,
                        left: `${ tooltipPosition?.left ?? 0 }px`,
                        top: `${ tooltipPosition?.top ?? 0 }px`,
                        maxWidth: maxWidth ? `min(${ maxWidth }, calc(100vw - 24px))` : 'calc(100vw - 24px)',
                        maxHeight: 'calc(100vh - 24px)',
                        overflowY: 'auto',
                        visibility: tooltipPosition ? 'visible' : 'hidden',
                        transition: 'none',
                        zIndex: 1000,
                    } : undefined"
                    @mouseleave="teleported && handleMouseLeave($event)"
                    @mouseover="teleported && handleClick('mouseOver')"
                >
                    <div
                        v-if="align ===  'center'"
                        class="tooltip_container_icon"
                        :style="teleported && tooltipPosition ? { left: `${ tooltipPosition.arrowLeft }px` } : undefined"
                    >
                        <tooltip-arrow/>
                    </div>
                    <div class="tooltip_container_content">
                        <ui-text
                            v-if="$slots.title"
                            class="tooltip_container_content_title"
                            :type="titleTextType"
                        >
                            <slot name="title"/>
                        </ui-text>
                        <ui-text
                            class="tooltip_container_content_text"
                            :type="textType"
                        >
                            <slot/>
                        </ui-text>
                    </div>
                </div>
            </transition>
        </teleport>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { ClickOutsideOptions } from '~/composables/map/click-outside';
import QuestionIcon from '~/assets/icons/basic/question.svg?component';
import TooltipArrow from '~/assets/icons/kit/tooltip-arrow.svg?component';
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';

const props = defineProps({
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
    align: {
        type: String as PropType<'right' | 'left' | 'center'>,
        default: 'center',
    },
    width: {
        type: String,
        default: 'max-content',
    },
    maxWidth: {
        type: String,
    },
    teleported: {
        type: Boolean,
        default: false,
    },
    openMethod: {
        type: String as PropType<TooltipOpenMethod>,
        default: 'mouseOver',
    },
    closeMethod: {
        type: String as PropType<TooltipCloseMethod>,
        default: 'mouseLeave',
    },
    clickOutsideOptions: {
        type: Object as PropType<Omit<ClickOutsideOptions, 'element' | 'callback'>>,
        default: () => ({}),
    },
    cursorDefault: {
        type: Boolean,
        default: false,
    },
    questionMarkSize: {
        type: String,
        default: '12px',
    },
    titleTextType: {
        type: String as PropType<UiTextTypes>,
        default: 'caption' satisfies UiTextTypes,
    },
    textType: {
        type: String as PropType<UiTextTypes>,
        default: 'caption-light' satisfies UiTextTypes,
    },
});
defineSlots<{ default(): any; activator(): any; title(): any }>();

function handleClick(eventType: 'mouseLeave' | 'mouseOver' | 'click' | 'focus' | 'focusOut') {
    switch (eventType) {
        case 'mouseLeave':
            if (props.closeMethod === 'mouseLeave') model.value = false;
            break;
        case 'mouseOver':
            if (props.openMethod === 'mouseOver') model.value = true;
            break;
        case 'click':
            if (props.teleported && props.openMethod === 'mouseOver') {
                model.value = true;
                break;
            }
            if (props.openMethod === 'click' && !model.value) model.value = true;
            if (props.closeMethod === 'click' && model.value) model.value = false;
            break;
        case 'focusOut':
            if (props.closeMethod === 'clickOutside' || (props.teleported && props.closeMethod === 'mouseLeave')) model.value = false;
            break;
        case 'focus':
            if (props.teleported && props.openMethod !== 'disabled') model.value = true;
            break;
        default:
            break;
    }
}

export type TooltipOpenMethod = 'click' | 'mouseOver' | 'disabled';

export type TooltipCloseMethod = 'delay' | 'click' | 'clickOutside' | 'mouseLeave';

export type TooltipLocation = 'left' | 'right' | 'top' | 'bottom';

const model = defineModel({
    type: Boolean,
    default: false,
});

const tooltip = ref<HTMLDivElement | null>(null);
const tooltipContainer = ref<HTMLDivElement | null>(null);
const tooltipPosition = ref<{ left: number; top: number; below: boolean; arrowLeft: number } | null>(null);

function handleKeydown(event: KeyboardEvent) {
    if (!props.teleported) return;
    if (event.key === 'Escape') {
        event.stopPropagation();
        model.value = false;
    }
    else if (event.key === 'Enter' || event.key === ' ') {
        if (event.key === ' ') event.preventDefault();
        handleClick('focus');
    }
}

function handleMouseLeave(event: MouseEvent) {
    const target = event.relatedTarget;
    if (props.teleported && target instanceof Node && (tooltip.value?.contains(target) || tooltipContainer.value?.contains(target))) return;
    handleClick('mouseLeave');
}

function updateTooltipPosition() {
    if (!props.teleported || !model.value || !tooltip.value || !tooltipContainer.value) return;
    const anchor = tooltip.value.getBoundingClientRect();
    const content = tooltipContainer.value.getBoundingClientRect();
    const margin = 12;
    const below = anchor.top < content.height + margin;
    const anchorCenter = anchor.left + (anchor.width / 2);
    const left = Math.max(margin, Math.min(anchorCenter - (content.width / 2), window.innerWidth - content.width - margin));
    tooltipPosition.value = {
        left,
        top: Math.max(margin, Math.min(below ? anchor.bottom : anchor.top - content.height, window.innerHeight - content.height - margin)),
        below,
        arrowLeft: Math.max(4, Math.min(anchorCenter - left - 10, content.width - 24)),
    };
}

watch([model, () => props.teleported], async () => {
    tooltipPosition.value = null;
    if (!model.value || !props.teleported) return;
    await nextTick();
    updateTooltipPosition();
}, { immediate: true });

const tooltipEventTarget = computed(() => import.meta.client && props.teleported && model.value ? window : undefined);
useEventListener(tooltipEventTarget, 'resize', updateTooltipPosition);
useEventListener(tooltipEventTarget, 'scroll', updateTooltipPosition, true);
useEventListener<KeyboardEvent>(tooltipEventTarget, 'keydown', event => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    model.value = false;
}, true);

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
useClickOutside({
    ...props.clickOutsideOptions,
    element: tooltip,
    callback: event => {
        if (props.teleported && event.target instanceof Node && tooltipContainer.value?.contains(event.target)) return;
        handleClick('focusOut');
    },
});
</script>

<style scoped lang="scss">
.tooltip {
    --transform: -50%;
    position: relative;

    &--align-right {
        --transform: -90%;
    }

    &--align-left {
        --transform: -10%;
    }

    &_activator {
        cursor: pointer;
        position: relative;

        &_question {
            svg {
                width: v-bind(questionMarkSize);
            }
        }
    }

    &--cursor-default .tooltip_activator {
        cursor: default;
    }

    &_container {
        position: absolute;
        z-index: 8;

        width: v-bind(width);
        max-width: v-bind(maxWidth);
        padding: 4px 4px 12px;

        color: $lightGray900;

        &--below {
            padding: 12px 4px 4px;

            .tooltip_container_icon {
                top: 0;
                transform: none;
            }
        }

        &_icon {
            position: absolute;
            top: calc(100% - 12px - 1px);
            left: calc(50% - 10px);
            transform: rotate(180deg);

            width: 20px;
            height: 12px;

            svg {
                fill: transparent;
                stroke: transparent;

                :deep(path[fill]) {
                    fill: $strokeDefault;
                }

                :deep(path[stroke]) {
                    fill: $darkGray800;
                    stroke: $strokeDefault;
                }
            }
        }

        &_content {
            display: flex;
            flex-direction: column;
            gap: 4px;

            padding: 6px 12px;
            border: 1px solid $strokeDefault;
            border-radius: 2px;

            background: $darkGray800;
        }

        &--appear {
            &-enter-active,
            &-leave-active {
                opacity: 1;
                transition: opacity 0.3s;
            }

            &-enter-from,
            &-leave-to {
                opacity: 0;
            }
        }
    }

    &--location-top .tooltip_container {
        bottom: 100%;
        left: 50%;
        transform: translateX(var(--transform));
    }

    &--location-bottom .tooltip_container {
        top: 100%;
        left: 50%;
        transform: translateX(var(--transform));
        padding: 12px 4px 4px;

        &_icon {
            top: auto;
            bottom: calc(100% - 12px - 1px);
            transform: none;
        }
    }

    &--location-left .tooltip_container {
        top: 50%;
        right: 100%;
        transform: translateY(var(--transform));
        padding: 4px 12px 4px 4px;

        &_icon {
            top: calc(50% - 6px);
            left: calc(100% - 16px - 1px);
            transform: rotate(90deg);
        }
    }

    &--location-right .tooltip_container {
        top: 50%;
        left: 100%;
        transform: translateY(var(--transform));
        padding: 4px 4px 4px 12px;

        &_icon {
            top: calc(50% - 6px);
            right: calc(100% - 16px - 1px);
            left: auto;
            transform: rotate(-90deg);
        }
    }
}
</style>
