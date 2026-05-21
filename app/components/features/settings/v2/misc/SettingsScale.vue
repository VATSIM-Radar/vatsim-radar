<template>
    <ui-text
        class="scale"
        :class="{ 'scale--hidden': value === 1 }"
        type="caption-light"
    >
        <div class="scale_col">
            <div class="scale_col_title">
                Original <span>x1</span>
            </div>
            <div class="scale_col_content">
                <span
                    v-for="icon in icons"
                    :key="icon.icon.icon"
                    :style="{ '--width': `${ icon.icon.width }px` }"
                    v-html="icon.svg"
                />
            </div>
        </div>
        <div class="scale_col">
            <div class="scale_col_title">
                Selected <span>x{{value}}</span>
            </div>
            <div class="scale_col_content">
                <span
                    v-for="icon in icons"
                    :key="icon.icon.icon"
                    :style="{
                        '--width': `${ icon.icon.width * (value ?? 1) }px`,
                        '--height': `${ icon.icon.height * (value ?? 1) }px`,
                    }"
                    v-html="icon.svg"
                />
            </div>
        </div>
    </ui-text>
</template>

<script setup lang="ts">
import { getSettingValueFromFunc } from '~/composables/settings/v2/utils';
import UiText from '~/components/ui/text/UiText.vue';

const value = getSettingValueFromFunc('map.preferences.aircraft.scale');

const icons = [
    { icon: radarIcons.c172, svg: await fetchAircraftSvgIcon('c172') },
    { icon: radarIcons.a320, svg: await fetchAircraftSvgIcon('a320') },
    { icon: radarIcons.a388, svg: await fetchAircraftSvgIcon('a388') },
];
</script>

<style scoped lang="scss">
.scale {
    display: grid;
    grid-template-columns: repeat(2, 50%);

    border: 2px solid $strokeDefault;
    border-radius: 4px;

    transition: 0.3s;

    &--hidden {
        visibility: hidden;
        opacity: 0;
    }

    &_col {
        &:first-child {
            border-right: 2px solid $strokeDefault;
        }

        &_title {
            display: flex;
            gap: 4px;
            justify-content: center;

            padding: 8px;
            border-bottom: 2px solid $strokeDefault;

            text-align: center;

            span {
                color: $whiteAlpha36;
            }
        }

        &_content {
            display: flex;
            gap: 24px;
            align-items: center;
            justify-content: center;

            height: 72px;
            padding: 8px;

            span {
                :deep(svg) {
                    width: var(--width);
                    height: var(--height);
                }
            }
        }
    }
}
</style>
