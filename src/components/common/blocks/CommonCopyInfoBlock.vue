<template>
    <div
        v-if="text"
        class="copy-info"
    >
        <div class="copy-info_left">
            <div
                v-if="$slots.default"
                class="copy-info_left_title"
            >
                <slot/>
            </div>
            <common-button
                class="copy-info_left_copy"
                type="link"
                @click="copy.copy(text)"
            >
                <template v-if="copy.copyState.value">
                    Copied!
                </template>
                <template v-else>
                    Copy
                </template>
            </common-button>
            <common-button
                v-if="!autoExpand"
                class="copy-info_left_expand"
                type="link"
                @click="expanded = !expanded"
            >
                <template v-if="expanded">
                    Collapse
                </template>
                <template v-else>
                    Expand
                </template>
            </common-button>
            <div
                v-if="$slots.actions"
                class="copy-info_left_title"
            >
                <slot name="actions"/>
            </div>
        </div>
        <div class="copy-info_right __info-sections">
            <slot name="prepend"/>
            <textarea
                ref="textarea"
                class="copy-info_textarea"
                readonly
                :value="text"
            />
            <slot name="append"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useCopyText } from '~/composables';
import CommonButton from '~/components/common/basic/CommonButton.vue';

const props = defineProps({
    text: {
        type: String as PropType<string | null>,
        default: null,
    },
    autoExpand: {
        type: Boolean,
        default: false,
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

    &_left {
        display: flex;
        gap: 8px;

        &_title {
            font-size: 12px;
            font-weight: 600;
        }

        &_expand {
            position: sticky;
            top: 0;
        }
    }

    &_textarea {
        resize: vertical;
        scrollbar-gutter: stable;

        padding: 8px;
        border: none;
        border-radius: 4px;

        font-size: 11px;
        color: $lightgray150;

        appearance: none;
        background: $darkgray875;
        outline: none;
        box-shadow: none;
    }
}
</style>
