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
        <ui-input-text v-model="snackbarText">
            Snackbar text
        </ui-input-text>
        <ui-select
            :items="[{ value: 'error' }, { value: 'warning' }, { value: 'info' }, { value: 'success' }]"
            :model-value="snackbarType"
            @update:modelValue="snackbarType = $event as SnackbarType"
        >
            Snackbar type
        </ui-select>
        <ui-button
            :disabled="!snackbarType || !snackbarText"
            @click="[store.addNotification({ type: snackbarType!, text: snackbarText, timeout: 10000, closable: true })]"
        >
            Add notification
        </ui-button>
    </div>
</template>

<script setup lang="ts">
import UiSnackbar from '~/components/ui/data/UiSnackbar.vue';
import type { SnackbarType } from '~/components/ui/data/UiSnackbar.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';

const snackbarType = ref<SnackbarType | null>(null);
const snackbarText = ref('');
const store = useStore();
</script>

<style lang="scss" scoped>
.snackbar {
    max-width: 400px;
}
</style>
