<template>
    <div
        class="error-500"
        :style="{ '--status-code': 'statusCode' in error ? error.statusCode : 500 }"
    >
        <div class="error-500_title">
            Oops!
        </div>
        <crash-icon class="error-500_image"/>
        <div class="error-500_text">
            Something went wrong
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { INuxtError } from '~/types';
import CrashIcon from 'assets/icons/errors/crash.svg?component';
import { useRadarError } from '~/composables/errors';

const props = defineProps({
    error: {
        type: Object as PropType<Partial<INuxtError>>,
        required: true,
    },
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
useRadarError(props.error);
</script>

<style scoped lang="scss">
.error-500 {
    position: relative;

    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    align-items: center;

    padding-top: 25dvh;


    font-size: 2vw;
    color: $error500;
    text-align: center;
    text-transform: uppercase;

    @include mobileOnly {
        font-size: 10vw;
    }

    &::before {
        content: counter(variable);
        counter-reset: variable var(--status-code);

        position: absolute;
        top: 0;

        font-size: 15vw;
        font-weight: 700;

        opacity: 0.2;
        background: linear-gradient(180deg, rgb(203, 66, 28, 0) 0%, #{$error500} 100%);
        background-clip: text;

        -webkit-text-fill-color: transparent;
        text-fill-color: transparent;

        @include mobileOnly {
            font-size: 50vw;
        }
    }

    &_title {
        font-weight: 700;
    }

    &_image {
        height: 38dvh;
        margin: -24px 0 24px;

        @include mobileOnly {
            width: 100%;
        }
    }
}
</style>
