<template>
    <div
        class="checkbox-block"
        :class="{ 'checkbox-block--disabled': disabled }"
        @click="checked = !checked"
    >
        <div class="checkbox-block_checkbox">
            <ui-checkbox
                v-model="checked"
                :disabled
                @click.stop
            />
        </div>
        <div
            v-if="$slots.title || $slots.default"
            class="checkbox-block_content"
        >
            <ui-text
                v-if="$slots.title"
                type="3b-medium"
            >
                <slot name="title"/>
            </ui-text>
            <ui-text
                v-if="$slots.default"
                type="3b"
            >
                <slot/>
            </ui-text>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiCheckbox from '~/components/ui/inputs/UiCheckbox.vue';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default: () => any; title: () => any }>();

const checked = defineModel({ type: Boolean, required: true });
</script>

<style scoped lang="scss">
.checkbox-block {
    cursor: pointer;
    user-select: none;

    display: flex;
    gap: 20px;

    padding: 16px;
    border: 1px solid $strokeDefault;
    border-radius: 4px;

    background: $darkGray900;

    @include boxShadowActive;

    @include hover {
        transition: 0.3s;

        &:hover {
            border-color: $darkGray100;
        }
    }

    &_content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 2px;
    }

    &--disabled {
        pointer-events: none;
        cursor: default;
        border-color: $whiteAlpha2;
        background: $darkGray900;
    }
}
</style>
