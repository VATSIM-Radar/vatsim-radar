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
        <logo-text class="logo_text"/>
    </div>
</template>

<script setup lang="ts">
import LogoText from '@/assets/icons/basic/logo-text.svg?component';

defineProps({
    width: {
        type: String,
        default: '48px',
    },
    textWidth: {
        type: String,
        default: '56px',
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

    color: $lightgray50;
    text-decoration: none;

    &_icon {
        width: v-bind(width);
    }

    &_text {
        width: v-bind(textWidth);
    }
}
</style>
