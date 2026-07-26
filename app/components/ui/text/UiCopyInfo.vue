<template>
    <div
        v-if="text"
        class="copy-info"
    >
        <ui-text
            v-if="$slots.default || $slots.actions"
            class="copy-info_header"
            type="2b-medium"
        >
            <div
                v-if="$slots.default"
                class="copy-info_header_title"
            >
                <slot/>
            </div>
            <div
                v-if="$slots.actions"
                class="copy-info_header_actions"
            >
                <slot name="actions"/>
            </div>
        </ui-text>
        <div
            class="copy-info_content __info-sections"
            :class="{ 'copy-info_content--with-expand': !autoExpand }"
        >
            <slot name="prepend"/>
            <textarea
                ref="textarea"
                class="copy-info_textarea"
                readonly
                :rows
                :value="text"
            />
            <div class="copy-info_content_actions">
                <ui-button
                    v-if="!autoExpand"
                    class="copy-info_expand"
                    :class="{ 'copy-info_expand--expanded': expanded }"
                    icon-width="12px"
                    type="link"
                    @click="expanded = !expanded"
                >
                    <arrow-top-icon width="12"/>
                </ui-button>
                <ui-button
                    class="copy-info_copy"
                    :class="{ 'copy-info_copy--copied': copy.copyState.value }"
                    icon-width="12px"
                    type="link"
                    @click="copy.copy(text)"
                >
                    <template #icon>
                        <check-icon
                            v-if="copy.copyState.value"
                            width="12"
                        />
                        <copy-icon
                            v-else
                            width="12"
                        />
                    </template>
                </ui-button>
            </div>
            <slot name="append"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useCopyText } from '~/composables';
import CopyIcon from '~/assets/icons/kit/copy.svg?component';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import CheckIcon from '@/assets/icons/kit/check.svg?component';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';

const props = defineProps({
    text: {
        type: String as PropType<string | null>,
        default: null,
    },
    autoExpand: {
        type: Boolean,
        default: false,
    },
    rows: {
        type: Number,
        default: 2,
    },
});

defineSlots<{ default?(): any; prepend?(): any; append?(): any; actions?(): any }>();

const copy = useCopyText();
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const expanded = ref(props.autoExpand);
const textarea = ref<HTMLTextAreaElement | null>(null);
const initialHeight = ref(0);

watch([expanded, textarea], ([val]) => {
    if (!textarea.value) return;

    if (CSS.supports('field-sizing', 'content') && props.autoExpand) return;

    if (val) {
        initialHeight.value = textarea.value.clientHeight;
        textarea.value.style.height = `${ textarea.value.scrollHeight }px`;
    }
    else {
        textarea.value.style.height = 'auto';
    }
});
</script>

<style scoped lang="scss">
.copy-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: $typographyPrimary;

    &_header {
        display: flex;
        gap: 8px;
    }

    &_copy {
        height: 16px;

        &--copied {
            color: $green500;
        }
    }

    &_expand {
        transform: rotate(180deg);
        height: 16px;
        transition: 0.3s;

        &--expanded {
            transform: rotate(0deg);
        }
    }

    &_textarea {
        resize: vertical;
        scrollbar-gutter: stable;

        min-height: 32px;
        padding: 8px 16px 8px 8px;
        border: none;
        border-radius: 4px;

        font-size: 11px;
        color: $lightGray500;

        appearance: none;
        background: $darkGray600;
        outline: none;
        box-shadow: none;
    }

    &_content {
        position: relative;

        &_actions {
            position: absolute;
            right: 8px;
            bottom: 12px;

            display: flex;
            gap: 8px;
            align-items: center;
        }

        &--with-expand .copy-info_textarea {
            padding-right: 36px;
        }

        &:not(&--with-expand) .copy-info_textarea{
            field-sizing: content;
        }
    }
}
</style>
