<template>
    <div class="color-picker">
        <ui-tooltip
            v-model="tooltipOpened"
            :click-outside-options="{ strict: true }"
            close-method="clickOutside"
            :cursor-default="transparencyOnly"
            location="bottom"
            max-width="100%"
            open-method="disabled"
            width="100%"
        >
            <template #activator>
                <div
                    class="color-picker__container"
                    @click="tooltipOpened = !transparencyOnly && !tooltipOpened"
                >
                    <div class="color-picker__content">
                        <div class="color-picker__content_text">
                            <slot/>
                        </div>
                        <div
                            v-if="getColor"
                            class="color-picker__content_preview"
                        />
                    </div>
                    <reset-icon
                        v-if="defaultColor && ((defaultColor.color !== model.color) || (!defaultColor.transparency ? (model.transparency && model.transparency !== 1) : model.transparency !== defaultColor.transparency))"
                        @click.stop="model = { transparency: 1, ...defaultColor }"
                    />
                    <ui-select
                        class="color-picker__transparency"
                        :class="{ 'color-picker__hidden': colorOnly }"
                        :items="transparencyOptions"
                        max-dropdown-height="150px"
                        :model-value="model.transparency ?? 1"
                        placeholder="Transparency"
                        width="150px"
                        @click.stop="tooltipOpened = false"
                        @update:modelValue="model = { ...model, transparency: +($event as string) }"
                    />
                    <div
                        class="color-picker__preview"
                        :class="{ 'color-picker__hidden': transparencyOnly }"
                        :style="{ '--color': model.color && getColorFromSettings(model as UserMapSettingsColor) }"
                    />
                </div>
            </template>

            <div class="color-picker_input">
                <ui-input-text
                    :model-value="getHexColor ?? ''"
                    placeholder="Custom #HEX"
                    @change="hexColorRegex.test(($event.target as HTMLInputElement).value) && (model = { ...model, color: hexToRgb(($event.target as HTMLInputElement).value) })"
                />
                <input
                    class="color-picker_input_color"
                    type="color"
                    :value="getHexColor ? shortHexToLong(getHexColor) : '#000000'"
                    @change="model = { ...model, color: hexToRgb(($event.target as HTMLInputElement).value) }"
                >
            </div>

            <div class="color-picker_title">
                Selected colors
            </div>

            <div class="color-picker_list">
                <div
                    v-for="(hex, color) in colorsList"
                    :key="color"
                    class="color-picker_list_item"
                    :class="{ 'color-picker_list_item--active': color === model.color }"
                    :style="{ '--color': hex }"
                    @click="model = { ...model, color }"
                />
            </div>
        </ui-tooltip>
    </div>
</template>

<script setup lang="ts">
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { UserMapSettingsColor } from '~/utils/backend/handlers/map-settings';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import { getColorFromSettings, hexToRgb, rgbToHex } from '~/composables/settings/colors';
import { hexColorRegex } from '~/utils/shared';
import ResetIcon from '~/assets/icons/kit/reset.svg?component';

defineProps({
    defaultColor: {
        type: Object as PropType<Partial<UserMapSettingsColor> | null>,
        default: null,
    },
    transparencyOnly: {
        type: Boolean,
        default: false,
    },
    colorOnly: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default: () => any }>();

const model = defineModel({ type: Object as PropType<Partial<UserMapSettingsColor>>, default: () => ({} as Partial<UserMapSettingsColor>) });

const themeColor = computed(() => getCurrentThemeHexColor(model.value.color as any));

const getColor = computed(() => {
    if (themeColor.value) return themeColor.value as string;
    return model.value.color ?? null;
});

const getHexColor = computed(() => {
    if (themeColor.value || !getColor.value) return null;
    return rgbToHex(...getColor.value.split(',').map(x => +x));
});

const tooltipOpened = ref(false);

const colorsList = Object.fromEntries(Object.entries(radarColors).filter(([key]) => key.endsWith('Hex')).map(([key, value]) => [key.replace('Hex', ''), getCurrentThemeHexColor(key.replace('Hex', '') as any)])) as Record<string, string>;

const transparencyOptions = computed<SelectItem[]>(() => {
    const options: SelectItem[] = [];

    for (let i = 0.1; i <= 1; i += 0.1) {
        options.unshift({
            value: i,
            text: `${ Math.floor((1 - i) * 100) }%`,
        });
    }

    options.push({
        value: 0.05,
        text: '95%',
    });

    options.push({
        value: 0.03,
        text: '97%',
    });

    options.push({
        value: 0.01,
        text: '99%',
    });

    return options;
});
</script>

<style scoped lang="scss">
.color-picker {
    &__container {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        font-size: 14px;
        font-weight: 600;

        @include mobileOnly {
            flex-wrap: wrap;

            .color-picker__content {
                width: 100%;
            }
        }

        >svg {
            width: 16px;
            min-width: 16px;
            color: $lightgray200;
        }
    }

    &__content {
        flex: 1 0 auto;
    }

    &__preview {
        width: 32px;
        min-width: 32px;
        height: 32px;
        border: 1px solid $lightgray200;
        border-radius: 8px;

        background: var(--color);
    }

    &__hidden {
        visibility: hidden;
        opacity: 0;

        @include mobileOnly {
            display: none;
        }
    }

    &_input {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;

        &_color {
            cursor: pointer;

            width: 42px;
            min-width: 42px;
            height: 42px;
            border: 0;
            border-radius: 4px;

            outline: 0;
            box-shadow: none;
        }
    }

    &_title {
        margin-top: 12px;
        margin-bottom: 8px;
        font-size: 14px;
    }

    &_list {
        container-type: inline-size;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        &_item {
            cursor: pointer;

            width: calc(9cqw - 4px * 9 / 10);
            height: calc(9cqw - 4px * 9 / 10);
            border: 1px solid $darkgray800;
            border-radius: 4px;

            background: var(--color);

            transition: 0.3s;

            @include mobileOnly {
                width: calc(15cqw - 4px * 5 / 6);
                height: calc(15cqw - 4px * 5 / 6);
            }

            &--active {
                border-color: $primary500;
                border-width: 2px;
            }

            &:hover {
                transform: scale(1.2);
                border-color: $lightgray200;
            }
        }
    }
}
</style>
