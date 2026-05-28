<template>
    <div class="sigmets-settings">
        <settings-transparency
            class="sigmets-settings_transparency"
            setting="sigmets"
        />
        <client-only>
            <div
                v-for="(button, key) in buttons"
                :key="key"
                class="sigmets-settings_btn"
                :class="{
                    'sigmets-settings_btn--dark': button.color.startsWith('lightGray'),
                    'sigmets-settings_btn--active': enabledSigmets.includes(key as SigmetType),
                }"
                :style="{ '--color': getCurrentThemeRgbColor(button.color).join(',') }"
                @click="toggleSigmet(key as SigmetType)"
            >
                {{ button.text }}
            </div>
        </client-only>
        <ui-toggle
            :model-value="showAirmets"
            @update:modelValue="setSettingByKey('sigmets.showAirmets', $event)"
        >
            AIRMETs
        </ui-toggle>
        <ui-toggle
            :model-value="rawSigmets"
            @update:modelValue="setSettingByKey('sigmets.raw', $event)"
        >
            Show raw SIGMET data only
        </ui-toggle>
    </div>
</template>

<script setup lang="ts">
import type { ColorsListRgb } from '~/utils/colors';
import type { SigmetType } from '~/types/map';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import SettingsTransparency from '~/components/features/settings/SettingsTransparency.vue';

const enabledSigmets = useSettingValueFromFunc('sigmets.enabled');
const showAirmets = useSettingValueFromFunc('sigmets.showAirmets');
const rawSigmets = useSettingValueFromFunc('sigmets.raw');

function toggleSigmet(key: SigmetType) {
    const current = enabledSigmets.value;
    setSettingByKey('sigmets.enabled', current.includes(key)
        ? current.filter((x: SigmetType) => x !== key)
        : [...current, key]);
}

interface Button {
    text: string;
    color: ColorsListRgb;
}

const buttons: Record<SigmetType, Button> = {
    CONV: {
        text: 'CONV',
        color: 'red500',
    },
    TS: {
        text: 'TS',
        color: 'red300',
    },
    ICE: {
        text: 'ICE',
        color: 'blue300',
    },
    FZLVL: {
        text: 'FZLVL',
        color: 'blue500',
    },
    TURB: {
        text: 'TURB',
        color: 'orange700',
    },
    MTW: {
        text: 'MTW',
        color: 'orange600',
    },
    WIND: {
        text: 'WIND',
        color: 'lightGray600',
    },
    WS: {
        text: 'WS',
        color: 'lightGray500',
    },
    IFR: {
        text: 'IFR',
        color: 'purple700',
    },
    OBSC: {
        text: 'OBSC',
        color: 'purple500',
    },
    VA: {
        text: 'VA',
        color: 'darkGray400',
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
        color: $lightGray300Orig;

        background: transparent;

        transition: 0.3s;

        &--dark.sigmets-settings_btn--active {
            color: $darkGray900Orig;
        }

        @include hover {
            &:hover {
                background: rgb(var(--color), 0.2);
            }
        }

        &--active {
            background: rgb(var(--color)) !important;
        }
    }
}
</style>
