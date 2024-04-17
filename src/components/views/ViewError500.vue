<template>
    <div class="error-500" :style="{'--status-code': 'statusCode' in error ? error.statusCode : 500}">
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

const props = defineProps({
    error: {
        type: Object as PropType<Partial<INuxtError>>,
        required: true,
    },
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
console.error(props.error);
</script>

<style scoped lang="scss">
.error-500 {
    flex: 1 0 auto;
    color: $error500;
    font-family: $openSansFont;
    position: relative;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2vw;
    text-transform: uppercase;
    padding-top: 25dvh;

    &::before {
        counter-reset: variable var(--status-code);
        content: counter(variable);
        position: absolute;
        top: 0;
        font-size: 15vw;
        font-weight: 700;
        background: linear-gradient(180deg, rgba(203, 66, 28, 0) 0%, #{$error500} 100%);
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-fill-color: transparent;
        opacity: 0.2;
    }

    &_title {
        font-weight: 700;
    }

    &_image {
        margin: -24px 0 24px;
        height: 38dvh;
    }
}
</style>
