<template>
    <ui-snackbar
        v-if="!rememberMessage || !saw"
        :model-value="rememberMessage ? !saw : undefined"
        size="S"
        :type
        @update:modelValue="() => saveMessage()"
    >
        <slot/>
    </ui-snackbar>
</template>

<script setup lang="ts">
import type { UserMessageType } from '~/utils/shared';
import UiSnackbar from '~/components/ui/data/UiSnackbar.vue';
import type { SnackbarType } from '~/components/ui/data/UiSnackbar.vue';
import { checkNotification, saveUserNotification } from '~/composables/user';

const props = defineProps({
    rememberMessage: {
        type: String as PropType<UserMessageType | keyof typeof UserMessageType>,
    },
    type: {
        type: String as PropType<SnackbarType>,
        required: true,
    },
});

defineSlots<{ default: () => any }>();

const saw = computed<boolean>(() => {
    return checkNotification(props.rememberMessage);
});

function saveMessage() {
    return saveUserNotification(props.rememberMessage);
}
</script>
