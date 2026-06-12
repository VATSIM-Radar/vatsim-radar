import type { ShortUser } from '~/utils/server/user';
import type { UserMessageType } from '~/utils/shared';

export const userNotifications = globalComputed(() => useCookie<Record<string, boolean>>('notifications', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
}));

export function checkNotification(notification: UserMessageType | keyof typeof UserMessageType | null | undefined): boolean {
    if (!notification) return false;

    const store = useStore();

    const notifications = userNotifications().value;

    if (!notifications.value || (store.user && Object.keys(notifications.value).length)) notifications.value = {};

    return store.user ? !!store.userMessages[notification] : !!notifications.value[notification];
}

export async function saveUserNotification(notification: UserMessageType | keyof typeof UserMessageType | null | undefined) {
    if (!notification) return;

    const store = useStore();

    if (store.user) {
        store.user.messages = (await $fetch<ShortUser>('/api/user/messages', {
            method: 'POST',
            body: {
                message: notification,
            },
        })).messages;
    }
    else {
        userNotifications().value.value[notification] = true;
        triggerRef(userNotifications().value);
    }
}
