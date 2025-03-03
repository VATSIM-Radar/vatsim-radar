<template>
    <div class="sigmets-settings">
        <div
            v-for="(button, key) in buttons"
            :key="key"
            class="sigmets-settings_btn"
            :class="{ 'sigmets-settings_btn--active': !store.localSettings?.filters?.layers?.sigmets?.disabled?.includes(key) }"
            :style="{ '--color': getCurrentThemeRgbColor(button.color).join(',') }"
            @click="setUserLocalSettings({ filters: { layers: { sigmets: {
                disabled: store.localSettings?.filters?.layers?.sigmets?.disabled?.includes(key)
                    ? store.localSettings?.filters?.layers?.sigmets?.disabled.filter(x => x !== key)
                    : [...store.localSettings?.filters?.layers?.sigmets?.disabled ?? [], key],
            } } } })"
        >
            {{ button.text }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { ColorsList } from '~/utils/backend/styles';
import type { SigmetType } from '~/types/map';

const store = useStore();

interface Button {
    text: string;
    color: ColorsList;
}

const buttons: Record<SigmetType, Button> = {
    WIND: {
        text: 'WIND',
        color: 'error300',
    },
    WS: {
        text: 'WS',
        color: 'error500',
    },
    FZLVL: {
        text: 'FZLVL',
        color: 'primary500',
    },
    ICE: {
        text: 'ICE',
        color: 'primary300',
    },
    TURB: {
        text: 'TURB',
        color: 'warning600',
    },
    MTW: {
        text: 'MTW',
        color: 'warning700',
    },
    IFR: {
        text: 'IFR',
        color: 'info500',
    },
    OBSC: {
        text: 'OBSC',
        color: 'info700',
    },
    TS: {
        text: 'ThunderStorm',
        color: 'error300',
    },
    VA: {
        text: 'VA',
        color: 'darkgray800',
    },
};
</script>

<style scoped lang="scss">
.sigmets-settings{
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    &_btn {
        cursor: pointer;

        padding: 4px;
        border: 1px solid rgb(var(--color));
        border-radius: 8px;

        font-family: $defaultFont;
        font-size: 12px;
        font-weight: 600;
        color: $lightgray0Orig;

        background: transparent;

        transition: 0.3s;

        @include hover {
            &:hover {
                background: rgba(var(--color), 0.2);
            }
        }

        &--active {
            background: rgb(var(--color));
        }
    }
}
</style>
