<template>
    <div
        ref="container"
        class="scroll-text-container"
    >
        <div
            ref="textSlot"
            class="scroll-text-slot"
            :class="{ 'animate': isOverflowing }"
            :style="slotStyle"
        >
            <slot name="text"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';

defineSlots<{
    text(): any;
}>();
const container = ref<HTMLElement | null>(null);
const textSlot = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);
const scrollAmount = ref(0);
const animationSpeed = ref(0);

const slotStyle = computed(() => ({
    '--scroll-amount': `${ scrollAmount.value + 4 }px`,
    '--animation-duration': `${ animationSpeed.value }s`,
}));

function checkOverflow() {
    if (!textSlot.value || !container.value) return;

    const containerWidth = container.value.clientWidth;
    const textWidth = textSlot.value.scrollWidth;

    isOverflowing.value = textWidth > containerWidth;
    scrollAmount.value = isOverflowing.value ? textWidth - containerWidth : 0;
    animationSpeed.value = scrollAmount.value;

    if (animationSpeed.value < 10) {
        animationSpeed.value = 8;
    }
    else if (animationSpeed.value < 50) {
        animationSpeed.value /= 2;
    }
    else if (animationSpeed.value > 50) {
        animationSpeed.value /= 5;
    }
}

onMounted(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkOverflow);
});

watch(() => textSlot.value?.textContent, () => {
    nextTick(checkOverflow);
});
</script>

  <style scoped lang="scss">
    .scroll-text {
        &-container {
            overflow: hidden;
            width: 100%;
        }

        &-slot {
            display: inline-block;
            white-space: nowrap;

            &.animate {
                animation: scroll-text var(--animation-duration) ease infinite;
            }
        }
    }

    @keyframes scroll-text {
        0%, 20% {
            transform: translateX(0);
        }

        80%, 90% {
            transform: translateX(calc(var(--scroll-amount) * -1));
        }

        100% {
            transform: translateX(0);
        }
    }
  </style>
