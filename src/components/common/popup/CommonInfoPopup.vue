<template>
    <div
        v-if="model"
        class="info-popup"
        :class="{ 'info-popup--absolute': absolute, 'info-popup--collapsed': collapsible && collapsed }"
        :style="{ '--max-height': maxHeight }"
    >
        <div class="info-popup_header">
            <div class="info-popup_header_title">
                <slot name="title"/>
            </div>
            <div class="info-popup_header_actions">
                <div
                    v-for="action in headerActions"
                    :key="action"
                    class="info-popup_header_actions_action"
                >
                    <slot :name="`action-${ action }`"/>
                </div>
                <div
                    v-if="collapsible"
                    class="info-popup_header_actions_action info-popup_header_actions_action--collapse"
                    @click="collapsed = !collapsed"
                >
                    <arrow-top-icon width="14"/>
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
                v-if="!collapsed"
                class="info-popup_content"
            >
                <common-tabs
                    v-if="tabs"
                    v-model="activeTab"
                    class="info-popup_content_tabs"
                    :tabs="tabs"
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
                    <common-block-title
                        v-if="index !== 0 || section.title || section.collapsible"
                        :bubble="section.bubble"
                        class="info-popup__section_separator"
                        :collapsed="!section.collapsible ? null : collapsedSections.includes(section.key)"
                        @update:collapsed="section.collapsible && (collapsedSections.includes(section.key) ? collapsedSections = collapsedSections.filter(x => x !== section.key) : collapsedSections.push(section.key))"
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
                    </common-block-title>
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
import type { PropType } from 'vue';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';

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
});

const model = defineModel({
    type: Boolean,
    required: true,
});
const collapsed = defineModel('collapsed', {
    type: Boolean,
    default: false,
});
const collapsedSections = ref<string[]>([]);
const collapsedOnceSections = new Set<string>([]);

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
    scrollbar-gutter: stable;

    overflow: auto;
    display: flex;
    flex-direction: column;

    width: 350px;
    max-width: calc(100dvw - 48px);
    max-height: var(--max-height);
    padding: 0 16px 16px;

    color: $lightgray150;
    text-align: left;

    background: $darkgray1000;
    border-radius: 8px;

    @include mobileOnly {
        width: 100%;
    }

    &--absolute {
        position: absolute;
    }

    &_header {
        position: sticky;
        z-index: 1;
        top: 0;

        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 16px 0;

        background: $darkgray1000;

        &:only-child {
            padding-bottom: 0;
        }

        &_actions {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 16px;

            &_action {
                user-select: none;

                display: flex;
                align-items: center;
                justify-content: center;

                min-width: 24px;
                min-height: 24px;

                color: $lightgray150;

                >* {
                    cursor: pointer;
                    transition: 0.3s;
                }

                &:not(:last-child, &--collapse) {
                    padding-right: 16px;
                    border-right: 1px solid varToRgba('lightgray150', 0.2);
                }

                @include hover {
                    &.info-popup_header_actions_action--close:hover {
                        color: $error500;
                    }

                    &:not(.info-popup_header_actions_action--close) >*:hover {
                        color: $primary500;
                    }
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
                overflow: hidden;
                max-height: 100%;
                transition: 0.5s ease-in-out;
            }

            &-enter-from, &-leave-to {
                max-height: 0;
                margin-top: 0;
            }
        }
    }

    &__section {
        &--actions {
            position: sticky;
            z-index: 5;
            bottom: -16px;

            padding: 8px 0;

            background: $darkgray1000;
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

                background: $darkgray850;
            }

            &:not(:only-child) {
                margin-bottom: 16px;
            }

            &_title, &_collapse {
                position: relative;
                background: $darkgray1000;
            }

            &_title {
                margin-left: 8px;
                padding: 0 4px;
                font-size: 12px;
                border-radius: 4px;
            }
        }
    }

    @media all and (min-width: 1600px) {
        width: 400px;
    }
}
</style>
