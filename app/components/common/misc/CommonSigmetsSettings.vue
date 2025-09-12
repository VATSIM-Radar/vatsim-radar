<template>
    <div class="sigmets-settings">
        <map-filter-transparency
            class="sigmets-settings_transparency"
            setting="sigmets"
        />
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
        <common-toggle
            :model-value="store.localSettings?.filters?.layers?.sigmets?.showAirmets !== false"
            @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { showAirmets: $event } } } })"
        >
            AIRMETs
        </common-toggle>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { ColorsList } from '~/utils/backend/styles';
import type { SigmetType } from '~/types/map';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import MapFilterTransparency from '~/components/map/filters/MapFilterTransparency.vue';

const store = useStore();

interface Button {
    text: string;
    color: ColorsList;
}

const buttons: Record<SigmetType, Button> = {
    CONVECTIVE: {
        text: 'CONV',
        color: 'error500',
    },
    TS: {
        text: 'TS',
        color: 'error300',
    },
    ICE: {
        text: 'ICE',
        color: 'primary300',
    },
    FZLVL: {
        text: 'FZLVL',
        color: 'primary500',
    },
    TURB: {
        text: 'TURB',
        color: 'warning700',
    },
    MTW: {
        text: 'MTW',
        color: 'warning600',
    },
    WIND: {
        text: 'WIND',
        color: 'lightgray200',
    },
    WS: {
        text: 'WS',
        color: 'lightgray100',
    },
    IFR: {
        text: 'IFR',
        color: 'info700',
    },
    OBSC: {
        text: 'OBSC',
        color: 'info500',
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

    &_transparency {
        width: 100%;
    }

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
                background: rgb(var(--color), 0.2);
            }
        }

        &--active {
            background: rgb(var(--color));
        }
    }
}
</style>
