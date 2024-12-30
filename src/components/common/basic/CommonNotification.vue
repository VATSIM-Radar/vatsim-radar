<template>
    <div
        v-if="!cookieName || !cookie?.value"
        class="warning"
        :class="[`warning--type-${ type }`]"
    >
        <div class="warning_text">
            <slot/>
        </div>

        <close-icon
            class="warning_icon"
            @click="cookie !== undefined ? cookie.value = true : undefined"
        />
    </div>
</template>

<script setup lang="ts">
import CloseIcon from '@/assets/icons/basic/close.svg?component';

const props = defineProps({
    cookieName: {
        type: String,
    },
    cookieMaxAge: {
        type: Number,
        default: 60 * 60 * 24 * 360,
    },
    type: {
        type: String as PropType<'info' | 'error'>,
        default: 'error',
    },
});

defineSlots<{ default: () => any }>();

const cookie = computed(() => props.cookieName
    ? useCookie<boolean>(props.cookieName, {
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge: props.cookieMaxAge,
    })
    : undefined);
</script>

<style scoped lang="scss">
.warning {
    display: flex;
    gap: 8px;
    align-items: center;

    padding: 4px 4px 4px 8px;

    font-size: 12px;
    font-weight: 600;

    border-left: 2px solid $error500;

    &--type-info {
        border-color: $primary500;
    }

    &_text {
        flex: 1 0 auto;
    }

    &_icon {
        cursor: pointer;
        align-self: flex-start;
        width: 16px;
        min-width: 16px;

        @include hover {
            transition: 0.3s;

            &:hover {
                color: $primary500;
            }
        }
    }
}
</style>
