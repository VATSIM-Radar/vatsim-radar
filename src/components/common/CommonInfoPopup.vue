<template>
    <div
        class="info-popup"
        :class="{'info-popup--absolute': absolute, 'info-popup--collapsed': collapsible && collapsed}"
        v-if="model"
        :style="{'--max-height': maxHeight}"
    >
        <div class="info-popup_header">
            <div class="info-popup_header_title">
                <slot name="title"/>
            </div>
            <div class="info-popup_header_actions">
                <div class="info-popup_header_actions_action" v-for="action in headerActions" :key="action">
                    <slot :name="`action-${action}`"/>
                </div>
                <div
                    class="info-popup_header_actions_action info-popup_header_actions_action--collapse"
                    v-if="collapsible"
                    @click="collapsed = !collapsed"
                >
                    <arrow-top-icon width="14"/>
                </div>
                <div
                    class="info-popup_header_actions_action info-popup_header_actions_action--close"
                    @click="model = false"
                >
                    <close-icon width="14"/>
                </div>
            </div>
        </div>
        <transition name="info-popup_content--collapse">
            <div class="info-popup_content" v-if="!collapsed">
                <common-tabs class="info-popup_content_tabs" :tabs="tabs" v-if="tabs" v-model="activeTab"/>
                <div
                    class="info-popup__section"
                    :class="{
                        'info-popup__section--has-title': section.title,
                        'info-popup__section--collapsible': section.collapsible,
                        'info-popup__section--collapsed': section.collapsible && collapsedSections.includes(section.key)
                    }"
                    v-for="(section, index) in getSections"
                    :key="section.key"
                >
                    <div
                        class="info-popup__section_separator"
                        v-if="index !== 0 || section.title || section.collapsible"
                        @click="section.collapsible && (collapsedSections.includes(section.key) ? collapsedSections = collapsedSections.filter(x => x !== section.key) : collapsedSections.push(section.key))"
                    >
                        <div class="info-popup__section_separator_title" v-if="section.title">
                            {{ section.title }}
                        </div>
                        <div
                            class="info-popup__section_separator_collapse"
                            v-if="section.collapsible"
                        >
                            <arrow-top-icon width="14"/>
                        </div>
                    </div>
                    <div
                        class="info-popup__section_content"
                        v-if="!section.collapsible || !collapsedSections.includes(section.key)"
                    >
                        <slot :name="section.key"/>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import CloseIcon from 'assets/icons/close.svg?component';
import ArrowTopIcon from 'assets/icons/arrow-top.svg?component';
import type { PropType } from 'vue';

interface InfoPopupSection {
    key: string;
    title?: string;
    collapsible?: boolean;
    collapsedDefault?: boolean
}

type InfoPopupContent = Record<string, {
    title: string,
    sections: InfoPopupSection[]
}>

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

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const activeTab = ref(props.tabs ? Object.keys(props.tabs)[0] : '');

const getSections = computed(() => {
    if (!props.tabs) return props.sections ?? [];
    return props.tabs[activeTab.value as keyof typeof props.tabs].sections;
});

watch(getSections, (sections) => {
    sections.forEach((section) => {
        if (section.collapsedDefault && !collapsedSections.value.includes(section.key)) collapsedSections.value.push(section.key);
    });
}, {
    immediate: true,
});
</script>

<style scoped lang="scss">
.info-popup {
    background: $neutral1000;
    padding: 16px;
    border-radius: 8px;
    overflow: hidden;
    width: 350px;
    text-align: left;
    color: $neutral150;

    &--absolute {
        position: absolute;
    }

    &_header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &_title {
            font-size: 14px;
            font-weight: 700;
            font-family: $openSansFont;
            color: $neutral100;
        }

        &_actions {
            display: flex;
            gap: 16px;

            &_action {
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 24px;
                min-height: 24px;
                color: $neutral150;
                cursor: pointer;
                transition: 0.3s;
                user-select: none;

                &:not(:last-child, &--collapse) {
                    border-right: 1px solid varToRgba('neutral150', 0.2);
                    padding-right: 16px;
                }

                @include hover {
                    &:hover {
                        color: $primary500;

                        &.info-popup_header_actions_action--close {
                            color: $error500;
                        }
                    }
                }
            }
        }
    }

    &--collapsed .info-popup_header_actions_action--collapse {
        transform: rotate(180deg);
    }

    &_content {
        max-height: var(--max-height);
        overflow: auto;
        scrollbar-gutter: stable;
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;

        &--collapse {
            &-enter-active, &-leave-active {
                transition: 0.3s;
            }

            &-enter-from, &-leave-to {
                max-height: 0;
                margin-top: 0;
            }
        }
    }

    &__section {
        &_separator {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;

            &:not(:only-child) {
                margin-bottom: 16px;
            }

            &::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 1px;
                background: $neutral850;
            }

            &_title, &_collapse {
                background: $neutral1000;
                position: relative;
            }

            &_title {
                font-size: 12px;
                margin-left: 8px;
                padding: 0 4px;
                border-radius: 4px;
            }

            &_collapse {
                width: 44px;
                height: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding-left: 20px;

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
        }

        &--collapsed .info-popup__section_separator_collapse svg {
            transform: rotate(180deg);
        }

        &--collapsible .info-popup__section_separator {
            cursor: pointer;
        }
    }
}
</style>
