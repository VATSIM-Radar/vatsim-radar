<template>
    <div class="copy-info" v-if="text">
        <div class="copy-info_left">
            <div class="copy-info_left_title">
                <slot/>
            </div>
            <common-button type="link" class="copy-info_left_copy" @click="copy.copy(text)">
                <template v-if="copy.copyState.value">
                    Copied!
                </template>
                <template v-else>
                    Copy
                </template>
            </common-button>
            <common-button type="link" class="copy-info_left_expand" @click="expanded = !expanded">
                <template v-if="expanded">
                    Collapse
                </template>
                <template v-else>
                    Expand
                </template>
            </common-button>
        </div>
        <textarea ref="textarea" :value="text" readonly class="copy-info_textarea"/>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useCopyText } from '~/composables';

defineProps({
    text: {
        type: String as PropType<string | null>,
        default: null,
    },
});

const copy = useCopyText();
const expanded = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);
const initialHeight = ref(0);

watch(expanded, (val) => {
    if(!textarea.value) return;

    if(val) {
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
    display: grid;
    grid-template-columns: 20% 75%;
    justify-content: space-between;

    &_left {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_title {
            font-weight: 600;
            font-size: 12px;
        }

        &_expand {
            position: sticky;
            top: 0;
        }
    }

    &_textarea {
        appearance: none;
        box-shadow: none;
        outline: none;
        border: none;
        border-radius: 4px;
        background: $neutral950;
        font-size: 11px;
        color: $neutral150;
        resize: vertical;
        padding: 8px;
        scrollbar-gutter: stable;
    }
}
</style>
