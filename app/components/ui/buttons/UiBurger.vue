<template>
    <div
        class="burger"
        :class="{ 'burger--active': model }"
        :style="{ '--burger-size': `${ size }px` }"
    >
        <div
            v-for="i in 3"
            :key="i"
            class="burger_item"
            :class="[`burger_item--${ i }`]"
        />
    </div>
</template>

<script setup lang="ts">
defineProps({
    size: {
        type: Number,
        default: 12,
    },
});

const model = defineModel({ type: Boolean, required: true });
</script>

<style scoped lang="scss">
.burger {
    --burger-line-height: calc(var(--burger-size) / 6);
    --burger-gap: var(--burger-line-height);

    position: relative;

    display: flex;
    flex-direction: column;
    gap: var(--burger-gap);
    align-items: center;

    &_item {
        width: var(--burger-size);
        height: var(--burger-line-height);
        border-radius: 4px;

        background: $lightGray300;

        transition: 0.3s;
    }

    &--active {
        .burger_item-- {
            &1 {
                transform: translateY(calc(var(--burger-line-height) + var(--burger-gap))) rotate(45deg);
            }

            &2 {
                width: 0;
            }

            &3 {
                transform: translateY(calc((var(--burger-line-height) + var(--burger-gap)) * -1)) rotate(-45deg);
            }
        }
    }
}
</style>
