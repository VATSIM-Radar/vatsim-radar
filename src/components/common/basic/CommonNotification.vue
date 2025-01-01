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
            v-if="cookie"
            class="warning_icon"
            @click="cookie.value = true"
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

    max-width: 100%;
    padding: 4px 4px 4px 8px;

    font-size: 12px;
    font-weight: 600;

    border-left: 2px solid $error500;

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
