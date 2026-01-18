<template>
    <div
        class="logo"
    >
        <img
            v-if="store.getCurrentTheme === 'light'"
            alt=""
            class="logo_icon"
            src="~/assets/icons/basic/logo-light.svg"
        >
        <img
            v-else
            alt=""
            class="logo_icon"
            src="~/assets/icons/basic/logo.svg"
        >
        <div class="logo_text">
            VATSIM<br>
            Radar
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps({
    width: {
        type: String,
        default: '40px',
    },
    fontSize: {
        type: String,
        default: '12px',
    },
});

const store = useStore();
</script>

<style scoped lang="scss">
.logo {
    user-select: none;

    display: flex;
    gap: 8px;
    align-items: center;

    font-size: v-bind(fontSize);
    font-weight: 700;
    color: $lightgray50;
    text-decoration: none;

    &_icon {
        width: v-bind(width);
        color: $lightgray100;

        :deep(> rect) {
            color: $primary500;
        }

        :deep(.wifi) {
            color: $darkgray950;
        }
    }
}
</style>
