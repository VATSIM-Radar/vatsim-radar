<template>
    <div class="toggle" :class="{'toggle--toggled': model, 'toggle--disabled': disabled}" @click="model = !model">
        <div class="toggle_label" v-if="$slots.default">
            <div class="toggle_label_title">
                <slot/>
            </div>
            <div class="toggle_label_description" v-if="$slots.description">
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

const model = defineModel({
    type: Boolean,
    required: true,
});
</script>

<style scoped lang="scss">
.toggle {
    display: flex;
    align-items: center;
    min-height: 24px;
    gap: 8px;
    cursor: pointer;
    transition: 0.3s;

    &--disabled {
        opacity: 0.5;
        pointer-events: none;
    }

    &_label {
        color: $neutral150;
        font-size: 13px;

        &_title {
            font-weight: 600;
        }

        &_description {
            font-size: 10px;
            margin-top: 4px;
            opacity: 0.8;
        }
    }

    &_toggler {
        position: relative;
        width: 32px;
        min-width: 32px;
        height: 8px;
        background: $neutral850;
        border-radius: 8px;
        display: flex;

        &::before {
            content: '';
            align-self: center;
            width: 16px;
            height: 16px;
            position: absolute;
            left: 0;
            background: $neutral150;
            border-radius: 100%;
            transition: 0.3s ease-in-out;
        }
    }

    &--toggled .toggle_toggler::before {
        background: $primary500;
        left: calc(100% - 16px);
    }
}
</style>
