<template>
    <div
        v-if="model"
        class="info-popup"
        :class="{ 'info-popup--absolute': absolute, 'info-popup--collapsed': collapsible && collapsed, 'info-popup--shadow': shadow }"
        :style="{ '--max-height': maxHeight }"
    >
        <div class="info-popup_header">
            <ui-text
                class="info-popup_header_title"
                type="h5"
            >
                <slot name="title"/>
            </ui-text>
            <div class="info-popup_header_actions">
                <div
                    v-for="action in headerActions"
                    :key="action"
                    class="info-popup_header_actions_action"
                >
                    <slot :name="`action-${ action }`"/>
                </div>
                <div
                    v-if="typeof minified === 'boolean'"
                    class="info-popup_header_actions_action info-popup_header_actions_action--minify"
                    @click="minified = !minified"
                >
                    <minus-icon width="14"/>
                </div>
                <div
                    v-if="collapsible && (!isMobile || typeof minified !== 'boolean')"
                    class="info-popup_header_actions_action info-popup_header_actions_action--collapse"
                    @click="collapsed = !collapsed"
                >
                    <arrow-top-icon
                        v-if="!isMobile"
                        width="14"
                    />
                    <div
                        v-else
                        class="info-popup_header_actions_action--collapse_line"
                    />
                </div>
                <div
                    v-if="!disabled"
                    class="info-popup_header_actions_action info-popup_header_actions_action--close"
                    @click="model = false"
                >
                    <close-icon width="14"/>
                </div>
            </div>
        </div>
        <transition name="info-popup_content--collapse">
            <div
                v-if="(!collapsed || (typeof minified === 'boolean' && isMobile))"
                class="info-popup_content"
            >
                <slot name="prepend"/>
                <ui-tabs
                    v-if="tabs && Object.values(tabs).length > 1"
                    v-model="activeTab"
                    class="info-popup_content_tabs"
                    full-width
                    :tabs="tabs"
                />
                <slot
                    v-if="activeTab"
                    :name="`tab-${ activeTab }`"
                />
                <div
                    v-for="(section, index) in getSections"
                    :key="section.key"
                    class="info-popup__section"
                    :class="[
                        `info-popup__section--type-${ section.key }`,
                        {
                            'info-popup__section--has-title': section.title || $slots[`${ section.key }Title`],
                            'info-popup__section--collapsible': section.collapsible,
                            'info-popup__section--collapsed': section.collapsible && collapsedSections.includes(section.key),
                        },
                    ]"
                >
                    <ui-block-title
                        v-if="index !== 0 || section.title || section.collapsible"
                        :bubble="section.bubble"
                        class="info-popup__section_separator"
                        :collapsed="!section.collapsible ? null : collapsedSections.includes(section.key)"
                        @update:collapsed="section.collapsible && (collapsedSections.includes(section.key) ?
                            (collapsedSections = collapsedSections.filter(x => x !== section.key)) && emit('collapsedSection', { key: section.key, value: false })
                            : (collapsedSections.push(section.key)) && emit('collapsedSection', { key: section.key, value: true }))"
                    >
                        <slot
                            :name="`${ section.key }Title`"
                            :section="section"
                        >
                            {{ section.title }}
                        </slot>
                        <template
                            v-if="$slots[`${ section.key }Bubble`] || section.bubble"
                            #bubble
                        >
                            <slot :name="`${ section.key }Bubble`"/>
                        </template>
                    </ui-block-title>
                    <div
                        v-if="!section.collapsible || !collapsedSections.includes(section.key)"
                        class="info-popup__section_content"
                    >
                        <slot
                            :name="section.key"
                            :section="section"
                        />
                    </div>
                </div>
                <div
                    v-if="$slots.actions"
                    class="info-popup__section info-popup__section--actions"
                >
                    <slot name="actions"/>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import CloseIcon from 'assets/icons/basic/close.svg?component';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import MinusIcon from '@/assets/icons/kit/minus.svg?component';
import type { PropType } from 'vue';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiText from '~/components/ui/text/UiText.vue';

/* eslint vue/require-explicit-slots: 0 */

export interface InfoPopupSection {
    key: string;
    title?: string;
    collapsible?: boolean;
    collapsedDefault?: boolean;
    collapsedDefaultOnce?: boolean;
    bubble?: string | number;
}

export type InfoPopupContent = Record<string, {
    title: string;
    sections: InfoPopupSection[];
    disabled?: boolean;
}>;

const props = defineProps({
    collapsible: {
        type: Boolean,
        default: false,
    },
    maxHeight: {
        type: String,
        default: '600px',
    },
    tabs: {
        type: Object as PropType<InfoPopupContent | undefined>,
    },
    sections: {
        type: Array as PropType<InfoPopupSection[] | undefined>,
    },
    headerActions: {
        type: Array as PropType<string[]>,
        default: () => [],
    },
    appearFrom: {
        type: String as PropType<'top' | 'right'>,
        default: 'right',
    },
    absolute: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    shadow: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    collapsedSection(settings: { key: string; value: boolean }) {
        return true;
    },
});
const model = defineModel({
    type: Boolean,
    required: true,
});
const collapsed = defineModel('collapsed', {
    type: Boolean,
    default: false,
});
const minified = defineModel('minified', {
    type: Boolean as PropType<boolean | null>,
    default: null,
});
const collapsedSections = ref<string[]>([]);
const collapsedOnceSections = new Set<string>([]);

const isMobile = useIsMobile();

const activeTab = defineModel('tab', { type: String });

// eslint-disable-next-line vue/no-setup-props-reactivity-loss,vue/no-ref-object-reactivity-loss
activeTab.value = activeTab.value || props.tabs ? (Object.entries(props.tabs ?? {}).filter(([_, value]) => !value.disabled)[0]?.[0] || Object.keys(props.tabs ?? {})[0]) : '';

const getSections = computed(() => {
    if (!props.tabs) return props.sections ?? [];
    return props.tabs[activeTab.value as keyof typeof props.tabs].sections;
});

watch(getSections, sections => {
    sections.forEach(section => {
        if (section.collapsedDefaultOnce && collapsedOnceSections.has(section.key)) return;

        if (section.collapsedDefault && !collapsedSections.value.includes(section.key)) {
            collapsedSections.value.push(section.key);
            collapsedOnceSections.add(section.key);
        }
    });
}, {
    immediate: true,
});
</script>

<style scoped lang="scss">
.info-popup {
    scrollbar-width: none;
    scrollbar-gutter: stable;

    container-name: info-popup;
    overflow: auto;
    display: flex;
    flex-direction: column;

    width: 360px;
    max-width: calc(100dvw - 48px);
    max-height: var(--max-height);
    padding: 0 16px 8px;
    border: 1px solid $strokeDefault;
    border-radius: 8px;

    color: $lightGray200;
    text-align: left;

    background: $black;

    @include mobileOnly {
        width: 100%;
    }

    &--shadow {
        box-shadow: 0 0 4px 4px $whiteAlpha2;
    }

    &--absolute {
        position: absolute;
    }

    &_header {
        position: sticky;
        z-index: 7;
        top: 0;

        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 8px 0;

        background: $black;

        @include mobileOnly {
            flex-wrap: wrap;
        }

        &:only-child {
            padding-bottom: 0;
        }

        &_actions {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 8px;

            @include mobileOnly {
                flex-wrap: wrap;
            }

            &_action {
                cursor: pointer;
                user-select: none;

                display: flex;
                align-items: center;
                justify-content: center;

                min-width: 16px;
                min-height: 16px;

                color: $lightgray150;

                transition: 0.3s;

                &:not(:last-child, &--collapse, &--minify:nth-last-child(-n+2)) {
                    padding-right: 8px;
                    border-right: 1px solid $whiteAlpha12;
                }

                &--close {
                    min-width: 20px;
                    min-height: 20px;
                    padding-left: 8px;
                    border-left: 1px solid $whiteAlpha12;

                    svg {
                        width: 14px;
                    }
                }

                &--minify {
                    min-width: 20px;
                    min-height: 20px;

                    svg {
                        width: 14px;
                    }
                }

                @include hover {
                    &.info-popup_header_actions_action--close:hover {
                        color: $error500;
                    }

                    &:not(.info-popup_header_actions_action--close):hover {
                        color: $primary500;
                    }
                }

                &--collapse .info-popup_header_actions_action--collapse_line {
                    width: 16px;
                    height: 2px;
                    border-radius: 8px;
                    background: currentColor;
                }
            }
        }
    }

    &--collapsed .info-popup_header_actions_action--collapse {
        transform: rotate(180deg);
    }

    &_content {
        display: flex;
        flex: 1 0 auto;
        flex-direction: column;
        gap: 16px;
        justify-content: space-between;

        margin-top: 8px;

        &--collapse {
            &-enter-active, &-leave-active {
                max-height: 100cqh;
                transition: 0.5s ease-in-out;
            }

            &-enter-from, &-leave-to {
                max-height: 0;
            }
        }

        &_tabs {
            position: sticky;
            z-index: 6;
            top: 36px;

            margin-top: -16px;
            padding-bottom: 16px;

            background: $black;

            :deep(.tabs_list) {
                background: $black;
            }
        }
    }


    &__section {
        &--actions {
            position: sticky;
            z-index: 5;
            bottom: -16px;

            margin-bottom: -16px;
            padding: 8px 0;

            background: $black;

            @include mobileOnly {
                position: relative;
                bottom: 0;
                margin-bottom: 0;
            }
        }

        &_separator {
            user-select: none;

            position: relative;

            display: flex;
            align-items: center;
            justify-content: space-between;

            &::before {
                content: '';

                position: absolute;

                width: 100%;
                height: 1px;

                background: $darkGray700;
            }

            &:not(:only-child) {
                margin-bottom: 16px;
            }

            &_title, &_collapse {
                position: relative;
                background: $black;
            }

            &_title {
                margin-left: 8px;
                padding: 0 4px;
                border-radius: 4px;
                font-size: 12px;
            }
        }
    }

    @media all and (min-width: 1600px) {
        width: 400px;
    }
}
</style>
