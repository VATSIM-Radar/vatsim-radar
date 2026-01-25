<template>
    <div
        class="separator"
        :class="{
            'separator--horizontal': horizontal,
            'separator--full': full,
            'separator--dashed': dashed,
            'separator--slotted': !!slots.default,
        }"
        :style="{ '--size': size }"
    >
        <slot/>
    </div>
</template>

<script setup lang="ts">
defineProps({
    horizontal: {
        type: Boolean,
        default: false,
    },
    full: {
        type: Boolean,
        default: false,
    },
    dashed: {
        type: Boolean,
        default: false,
    },
    size: {
        type: String,
    },
    // Affects both padding and margin
    distance: {
        type: String,
        default: '8px',
    },
});

defineSlots<{ default: () => any }>();
const slots = useSlots();
</script>

<style lang="scss" scoped>
.separator {
    --_size: var(--size, 75%);
    position: relative;

    &::before {
        content: '';

        position: absolute;
        top: calc(50% - var(--_size) / 2);
        left: 0;

        height: var(--height, 75%);
        border-color: $whiteAlpha12;
        border-style: solid;
        border-width: 0 0 0 1px;
    }

    &:not(&--horizontal) {
        margin-left: v-bind(distance);
        padding-left: v-bind(distance);
    }

    &--horizontal {
        margin-top: v-bind(distance);
        padding-top: v-bind(distance);

        &::before {
            left: calc(50% - var(--_size) / 2);
            width: var(--_size);
            height: 0;
            border-width: 1px 0 0;
        }
    }

    &:not(&--slotted) {
        align-self: stretch;
        margin: 0 v-bind(distance);
        padding: 0 v-bind(distance);

        &.separator--horizontal {
            margin: v-bind(distance) 0;
            padding: v-bind(distance) 0;
        }
    }

    &--full {
        &::before {
            top: 0;
            height: 100%;
        }

        &.separator--horizontal::before {
            left: 0;
            width: 100%;
            height: 0;
        }
    }

    &--dashed::before {
        border-style: dashed;
    }
}
</style>
