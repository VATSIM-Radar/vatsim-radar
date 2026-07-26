<template>
    <div class="theme __horizontal-group-4">
        <div
            class="theme_item"
            :class="{ 'theme_item--selected': value === 'default' }"
            @click="value = 'default'"
        >
            <div class="theme_item_image">
                <div class="theme_item_image_item" :style="{ backgroundImage: `url(${ ThemeDark })` }"/>
                <settings-theme-bg class="theme_item_image_bg"/>
            </div>
            <ui-text class="theme_item_text" type="caption">
                Dark
            </ui-text>
            <ui-radio
                class="theme_item_radio"
                hide-text
                :model-value="value === 'default'"
                value="default"
            />
        </div>
        <div
            class="theme_item"
            :class="{ 'theme_item--selected': !value }"
            @click="value = null"
        >
            <div class="theme_item_image">
                <div class="theme_item_image_item" :style="{ backgroundImage: `url(${ ThemeSystem })` }"/>
                <settings-theme-bg class="theme_item_image_bg"/>
            </div>
            <ui-text class="theme_item_text" type="caption">
                System
            </ui-text>
            <ui-radio
                class="theme_item_radio"
                hide-text
                :model-value="!value"
                value="null"
            />
        </div>
        <div
            class="theme_item"
            :class="{ 'theme_item--selected': value === 'light' }"
            @click="value = 'light'"
        >
            <div class="theme_item_image">
                <div class="theme_item_image_item" :style="{ backgroundImage: `url(${ ThemeLight })` }"/>
                <settings-theme-bg class="theme_item_image_bg"/>
            </div>
            <ui-text class="theme_item_text" type="caption">
                Light
            </ui-text>
            <ui-radio
                class="theme_item_radio"
                hide-text
                :model-value="value === 'light'"
                value="light"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import ThemeDark from '~/assets/images/theme-dark.png';
import ThemeLight from '~/assets/images/theme-light.png';
import ThemeSystem from '~/assets/images/theme-system.png';
import UiRadio from '~/components/ui/inputs/UiRadio.vue';
import SettingsThemeBg from '~/assets/icons/basic/settings-theme-bg.svg?component';
import { getKeyedValueFromSettings } from '~/composables/settings/v2/utils';

const store = useStore();

const theme = useCookie<ThemesList | null>('theme', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});

const value = computed({
    get() {
        return getKeyedValueFromSettings('appearance.theme');
    },
    set(value) {
        if (value === null) value = undefined;
        setSettingByKey('appearance.theme', value);
    },
});

watch(value, val => {
    if (!val) {
        theme.value = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'default';
    }
    else theme.value = val;

    store.theme = theme.value ?? 'default';
});
</script>

<style scoped lang="scss">
.theme {
    &_item {
        --stroke-color: #{$strokeDefault};

        cursor: pointer;

        position: relative;

        display: flex;
        flex-direction: column;

        width: 160px;
        height: 132px;
        border: 2px solid var(--stroke-color);
        border-radius: 8px;

        background: $backgroundLevel1;

        transition: border-color 0.3s;

        &_image {
            position: relative;
            overflow: hidden;
            flex-grow: 1;
            border-bottom: 2px solid $strokeDefault;

            &_item {
                position: relative;
                z-index: 1;

                height: 100%;
                margin: 10px 10px 0;
                border: solid $strokeDefault;
                border-width: 1px 1px 0;
                border-radius: 4px;

                background: no-repeat top / 100% auto;

                transition: border-color 0.3s;
            }

            &_bg {
                position: absolute;
                top: 6px;
                left: -8px;

                display: none;

                width: calc(100% + 16px);
                height: 100%;
            }
        }

        &_text {
            display: flex;
            align-items: center;

            height: 32px;
            padding: 2px 12px;

            transition: border-color 0.3s;
        }

        &_radio {
            position: absolute;
            z-index: 2;
            top: 4px;
            right: 4px;
        }

        @include hover {
            &:hover {
                --stroke-color: #{$strokeSecondary};
            }
        }

        &--selected {
            --stroke-color: #{$brandPrimaryStroke} !important;
        }
    }
}
</style>
