<template>
    <div
        v-if="!cookieName || !notifications[cookieName]"
        class="warning"
        :class="[`warning--type-${ type }`]"
    >
        <div class="warning_text">
            <slot/>
        </div>

        <close-icon
            v-if="cookieName"
            class="warning_icon"
            @click="notifications[cookieName!] = true"
        />
    </div>
</template>

<script setup lang="ts">
import CloseIcon from '@/assets/icons/basic/close.svg?component';

defineProps({
    cookieName: {
        type: String,
    },
    type: {
        type: String as PropType<'info' | 'error'>,
        default: 'error',
    },
});

defineSlots<{ default: () => any }>();

const notifications = useCookie<Record<string, boolean>>('notifications', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});
if (!notifications.value) notifications.value = {};
</script>

<style scoped lang="scss">
.warning {
    display: flex;
    gap: 8px;
    align-items: center;

    max-width: 100%;
    padding: 4px 4px 4px 8px;
    border-left: 2px solid $error500;

    font-size: 12px;
    font-weight: 600;

    &--type-info {
        border-color: $primary500;
    }

    &_text {
        flex-grow: 1;
    }

    &_icon {
        cursor: pointer;
        align-self: flex-start;
        width: 12px;
        min-width: 12px;

        @include hover {
            transition: 0.3s;

            &:hover {
                color: $primary500;
            }
        }
    }
}
</style>
