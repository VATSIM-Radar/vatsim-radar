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
import type { ShortUser } from '~/utils/server/user';
import UiSnackbar from '~/components/ui/data/UiSnackbar.vue';
import type { SnackbarType } from '~/components/ui/data/UiSnackbar.vue';

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

const store = useStore();

const notifications = useCookie<Record<string, boolean>>('notifications', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});

if (!notifications.value || store.user) notifications.value = {};

const saw = computed<boolean>(() => {
    if (!props.rememberMessage) return false;

    return store.user ? !!store.userMessages[props.rememberMessage] : !!notifications.value[props.rememberMessage];
});

async function saveMessage() {
    if (!props.rememberMessage) return;

    if (store.user) {
        store.user.messages = (await $fetch<ShortUser>('/api/user/messages', {
            method: 'POST',
            body: {
                message: props.rememberMessage,
            },
        })).messages;
    }
    else {
        notifications.value[props.rememberMessage] = true;
        triggerRef(notifications);
    }
}
</script>
