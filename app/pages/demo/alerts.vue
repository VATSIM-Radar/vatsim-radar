<template>
    <div class="__info-sections">
        <ui-snackbar
            v-for="type in ['error', 'warning', 'info', 'success'] satisfies SnackbarType[]"
            :key="type"
            :type
        >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam faucibus nisi sed velit efficitur, quis tempus leo ultricies. Suspendisse fringilla aliquam fringilla. Nunc rutrum eu dolor eget egestas.
        </ui-snackbar>
        <ui-snackbar
            v-for="type in ['error', 'warning', 'info', 'success'] satisfies SnackbarType[]"
            :key="type"
            model-value
            size="S"
            :type
        >
            Please disable VATGlasses if you don't like realistic boundaries
        </ui-snackbar>
    </div>
</template>

<script setup lang="ts">
import UiSnackbar from '~/components/ui/data/UiSnackbar.vue';
import type { SnackbarType } from '~/components/ui/data/UiSnackbar.vue';
</script>

<style lang="scss" scoped>
.snackbar {
    max-width: 400px;
}
</style>
