<template>
    <div
        v-if="model !== false"
        class="snackbar"
        :class="[`snackbar--type-${ type }`, `snackbar--size-${ size }`, { 'snackbar--closeable': typeof model === 'boolean' }]"
    >
        <div class="snackbar_icon">
            <slot name="icon">
                <error-icon v-if="type === 'error'"/>
                <warning-icon v-else-if="type === 'warning'"/>
                <success-icon v-else-if="type === 'success'"/>
                <info-icon v-else/>
            </slot>
        </div>
        <ui-text
            class="snackbar_text"
            type="caption"
        >
            <slot/>
        </ui-text>
        <div
            v-if="typeof model === 'boolean'"
            class="snackbar_close"
            @click="model = false"
        >
            <close-icon/>
        </div>
    </div>
</template>

<script setup lang="ts">
import ErrorIcon from '~/assets/icons/kit/error.svg?component';
import WarningIcon from '~/assets/icons/kit/warning.svg?component';
import SuccessIcon from '~/assets/icons/kit/success.svg?component';
import InfoIcon from '~/assets/icons/kit/info.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import UiText from '~/components/ui/text/UiText.vue';

export type SnackbarType = 'error' | 'warning' | 'info' | 'success';

defineProps({
    type: {
        type: String as PropType<SnackbarType>,
        required: true,
    },
    size: {
        type: String as PropType<'M' | 'S'>,
        default: 'M',
    },
});

defineSlots<{ default?(): any; icon?(): any }>();

const model = defineModel({ type: Boolean, default: null });
</script>

<style scoped lang="scss">
.snackbar {
    --color: #{$brandPrimaryStroke};
    display: flex;
    gap: 12px;
    align-items: center;

    padding: 12px;
    border: 1px solid var(--color);
    border-radius: 8px;

    color: $typographyPrimary;

    &--type-error {
        --color: #{$errorPrimaryStroke};
    }

    &--type-warning {
        --color: #{$warningPrimaryStroke};
    }

    &--type-success {
        --color: #{$successPrimaryStroke};
    }

    &_icon {
        color: var(--color);

        &,svg {
            width: 20px;
            min-width: 20px;
        }
    }

    &_text {
        overflow: hidden;
        display: -webkit-box;
        flex-grow: 1;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;

        max-height: 54px;
    }

    &_close {
        cursor: pointer;

        display: flex;
        align-items: center;
        justify-content: center;

        width: 12px;
        min-width: 12px;
        height: 12px;

        svg {
            width: 10px;
        }

        @include hover {
            transition: 0.3s;

            &:hover {
                color: $typographySecondary;
            }
        }
    }

    &--size-S {
        gap: 8px;
        padding: 8px;

        .snackbar_icon {
            &,svg {
                width: 16px;
                min-width: 16px;
            }
        }
    }
}
</style>
