<template>
    <div
        class="theme"
        :class="[`theme--${ store.theme ?? 'default' }`]"
    >
        <div
            class="theme_item theme_item--dark"
            @click="[theme = 'default', store.theme = theme]"
        >
            <dark-theme/>
        </div>
        <div
            class="theme_item theme_item--light"
            @click="[theme = 'light', store.theme = theme]"
        >
            <light-theme/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import DarkTheme from 'assets/icons/header/dark-theme.svg?component';
import LightTheme from 'assets/icons/header/light-theme.svg?component';
import type { ThemesList } from '~/utils/backend/styles';

const store = useStore();

const theme = useCookie<ThemesList>('theme', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});
</script>

<style scoped lang="scss">
.theme {
    position: relative;

    display: grid;
    grid-template-columns: repeat(2, 45px);

    height: 32px;
    border-radius: 8px;

    color: $lightgray150;

    background: $darkgray900;

    &::before {
        content: '';

        position: absolute;
        top: 0;
        left: 0;

        width: 45px;
        height: 100%;
        border-radius: 8px;

        background: $primary500;

        transition: 0.5s ease-in-out;
    }

    &_item {
        cursor: pointer;

        position: relative;

        display: flex;
        align-items: center;
        justify-content: center;

        transition: 0.5s ease-in-out;

        svg {
            width: 15px;

            :deep(path) {
                transition: fill 0.5s ease-in-out;
            }
        }
    }

    &--light {
        &::before {
            left: 45px;
        }

        .theme_item--light {
            @keyframes lightColorChange {
                0% {
                    color: $darkgray900Orig;
                }

                100% {
                    color: $darkgray900;
                }
            }

            & {
                transform: rotate(-90deg);
                color: $darkgray900;
                animation: lightColorChange 0.5s ease-in-out;
            }
        }

        .theme_item--dark :deep(path) {
            fill: transparent;
        }
    }

    @at-root .theme--light .theme_item--light {
        cursor: default;
    }

    @at-root .theme--default .theme_item--dark {
        cursor: default;
    }
}
</style>
