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
        </div>
        <textarea :value="text" readonly class="copy-info_textarea"/>
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
