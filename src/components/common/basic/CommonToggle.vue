<template>
    <div
        class="toggle"
        :class="{ 'toggle--toggled': model, 'toggle--disabled': disabled }"
        @click="model = !model"
    >
        <div
            v-if="$slots.default"
            class="toggle_label"
        >
            <div class="toggle_label_title">
                <slot/>
            </div>
            <div
                v-if="$slots.description"
                class="toggle_label_description"
            >
                <slot name="description"/>
            </div>
        </div>
        <div class="toggle_toggler"/>
    </div>
</template>

<script setup lang="ts">
defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default?: () => any; description?: () => any }>();

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.toggle {
    cursor: pointer;
    user-select: none;

    display: flex;
    gap: 8px;
    align-items: center;

    min-height: 24px;

    font-family: $defaultFont;

    transition: 0.3s;

    &--disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    &_label {
        font-size: 13px;
        color: $lightgray150;

        &_title {
            font-weight: 600;
        }

        &_description {
            margin-top: 4px;
            font-size: 10px;
            opacity: 0.8;
        }
    }

    &_toggler {
        position: relative;

        display: flex;

        width: 32px;
        min-width: 32px;
        height: 8px;
        border-radius: 8px;

        background: $darkgray850;

        &::before {
            content: '';

            position: absolute;
            left: 0;

            align-self: center;

            width: 16px;
            height: 16px;
            border-radius: 100%;

            background: $lightgray150;

            transition: 0.3s ease-in-out;
        }
    }

    &--toggled .toggle_toggler::before {
        left: calc(100% - 16px);
        background: $primary500;
    }
}
</style>
