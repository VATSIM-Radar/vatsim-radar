<template>
    <div
        ref="picker"
        class="color-picker"
    >
        <div class="color-picker__input">
            <ui-input-text
                :focused="isOpen"
                :model-value="getHexColor"
                :placeholder="themeColor ?? 'Custom hex'"
                @change="hexColorRegex.test(($event.target as HTMLInputElement).value) && emit('update:modelValue', { ...modelValue, color: hexToRgb(($event.target as HTMLInputElement).value) })"
                @update:focused="$event && (isOpen = $event)"
            >
                <template
                    v-if="!colorOnly"
                    #prepend
                >
                    <ui-select
                        :items="transparencyOptions"
                        max-dropdown-height="150px"
                        :model-value="modelValue?.transparency ?? defaultColor?.transparency ?? 1"
                        placeholder="Transparency"
                        width="100px"
                        @update:modelValue="emit('update:modelValue', { ...modelValue, transparency: +($event as string) })"
                    />
                </template>

                <template v-if="transparencyOnly" #htmlContent>
                    Transparency
                </template>

                <template
                    v-if="$slots.default"
                    #default
                >
                    <slot/>
                </template>

                <template
                    v-if="(modelValue && defaultColor && (modelValue.color !== defaultColor.color || modelValue.transparency !== defaultColor.transparency)) || !transparencyOnly"
                    #append
                >
                    <div class="color-picker__input_append">
                        <reset-icon
                            v-if="modelValue && defaultColor && (modelValue.color !== defaultColor.color || modelValue.transparency !== defaultColor.transparency)"
                            class="color-picker__input_reset"
                            @click.stop="emit('update:modelValue', null)"
                        />

                        <div
                            v-if="!transparencyOnly"
                            class="color-picker__input_color"
                            :style="{
                                '--image': `url(${ ColorBg })` ,
                                '--color': displayedColor,
                            }"
                            @click="isOpen = !isOpen"
                        />
                    </div>

                    <transition name="color-picker__dropdown--appear">
                        <div
                            v-if="isOpen"
                            class="color-picker__dropdown"
                        >
                            <div
                                v-if="setting && lastSelected[setting]"
                                class="color-picker__dropdown_history"
                            >
                                <ui-text
                                    class="color-picker__dropdown_history_title"
                                    type="3b-medium"
                                >
                                    Last selected colors
                                </ui-text>
                                <div class="color-picker__dropdown_history_list">
                                    <div
                                        v-for="(color) in lastSelected[setting].filter(x => modelValue?.color !== x)"
                                        :key="color"
                                        class="color-picker__dropdown_history__item"
                                        :class="[`color-picker_list_item--color-${ color }`]"
                                        :style="{ '--color': getHexColorFromHistory(color) }"
                                        @click="emit('update:modelValue', { ...modelValue, color })"
                                    />
                                </div>
                            </div>

                            <div class="color-picker__dropdown_list">
                                <ui-block-title>
                                    Custom color
                                </ui-block-title>

                                <input
                                    class="color-picker__dropdown_color"
                                    type="color"
                                    :value="getHexColor ? shortHexToLong(getHexColor) : '#000000'"
                                    @change="emit('update:modelValue', { ...modelValue, color: hexToRgb(($event.target as HTMLInputElement).value) })"
                                    @click.stop
                                >
                            </div>

                            <div class="color-picker__dropdown_list">
                                <ui-block-title>
                                    Selected colors
                                </ui-block-title>

                                <div class="color-picker__dropdown_items">
                                    <div
                                        v-for="(hex, color) in colorsList"
                                        :key="color"
                                        class="color-picker__dropdown_item"
                                        :class="[{ 'color-picker__dropdown_item--active': color === modelValue?.color }, `color-picker__dropdown_item--color-${ color }`]"
                                        :style="{ '--color': hex }"
                                        @click="emit('update:modelValue', { ...modelValue, color })"
                                    />
                                </div>
                            </div>
                        </div>
                    </transition>
                </template>
            </ui-input-text>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import { getColorFromSettings, hexToRgb, rgbToHex } from '~/composables/settings/colors';
import { hexColorRegex } from '~/utils/shared';
import ColorBg from '~/assets/icons/basic/color-palette.svg';
import ResetIcon from '~/assets/icons/kit/reset.svg?component';
import { setCustomDefuMergeAsIs } from '~/composables';
import UiText from '~/components/ui/text/UiText.vue';
import type { ColorsList } from '~/utils/colors';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';

const props = defineProps({
    modelValue: {
        type: Object as PropType<Partial<UserMapSettingsColor> | null | undefined>,
    },
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
    // Allows to use Last selected colors
    setting: {
        type: String,
    },
});

const emit = defineEmits({
    'update:modelValue'(data: Partial<UserMapSettingsColor> | null) {
        // TODO this is not working
        setCustomDefuMergeAsIs();
        return true;
    },
});

defineSlots<{ default: () => any }>();

const isOpen = ref(false);

const picker = useTemplateRef('picker');

useClickOutside({
    element: picker,
    callback: () => {
        isOpen.value = false;
    },
});

const lastSelected = useCookie<Record<string, string[]>>('last-selected-colors', {
    default: () => ({}),
    sameSite: 'none',
    secure: true,
    path: '/',
});

function getHexColorFromHistory(color: string) {
    return color in radarColors ? getCurrentThemeHexColor(color as ColorsList) : color;
}

const themeColor = computed<string | undefined>(() => props.modelValue ? getCurrentThemeHexColor(props.modelValue.color as any) : props.defaultColor?.color ? getCurrentThemeHexColor(props.defaultColor?.color as ColorsList) : undefined);

const getColor = computed(() => {
    if (themeColor.value) return themeColor.value;
    return props.modelValue?.color ?? null;
});

const getHexColor = computed(() => {
    if (themeColor.value || !getColor.value) return null;

    if (getColor.value.startsWith('#')) return getColor.value;

    return rgbToHex(...getColor.value.split(',').map(x => +x));
});

const displayedColor = computed(() => {
    return props.modelValue?.color ? getColorFromSettings(props.modelValue as UserMapSettingsColor) : props.defaultColor?.color ? getColorFromSettings(props.defaultColor as UserMapSettingsColor) : undefined;
});

const colorsList = Object.fromEntries(Object.entries(radarColors).filter(([key]) => key.endsWith('Hex') && !key.includes('Alpha')).map(([key, value]) => [key.replace('Hex', ''), getCurrentThemeHexColor(key.replace('Hex', '') as any)])) as Record<string, string>;

watch(() => props.modelValue?.color, val => {
    if (!val || !props.setting) return;

    lastSelected.value[props.setting] ??= [];

    lastSelected.value[props.setting] = lastSelected.value[props.setting].filter(x => x !== val);
    lastSelected.value[props.setting].push(val);
});

const transparencyOptions = computed<SelectItem[]>(() => {
    const options: SelectItem[] = [];

    for (let i = 0.1; i <= 1; i += 0.1) {
        options.unshift({
            value: +i.toFixed(2),
            text: `${ Math.round(i * 100) }%`,
        });
    }

    options.unshift({
        value: 0.05,
        text: '5%',
    });

    options.unshift({
        value: 0.07,
        text: '7%',
    });

    options.unshift({
        value: 0.01,
        text: '1%',
    });

    return options.sort((a, b) => (b.value as number) - (a.value as number));
});
</script>

<style scoped lang="scss">
.color-picker {
    &__input {
        &_append {
            display: flex;
            gap: 8px;
            align-items: center;

        }

        &_reset {
            cursor: pointer;
            width: 12px;
        }

        &_color {
            cursor: pointer;

            position: relative;

            width: 24px;
            height: 24px;

            background: var(--image) no-repeat center / contain;

            &::before {
                content: '';

                position: absolute;
                z-index: 1;
                inset: 3px;

                width: 18px;
                height: 18px;
                border: 3px solid $strokeDefault;
                border-radius: 9999px;

                background: var(--color, $darkGray900);
            }

            &::after {
                content: '';

                position: absolute;
                inset: 3px;

                width: 18px;
                height: 18px;
                border-radius: 100%;

                background: $darkGray900;
            }
        }
    }

    &__dropdown {
        position: absolute;
        z-index: 6;
        top: calc(100% - 1px);
        left: -1px;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;

        width: calc(100% + 2px);
        max-height: 250px;
        padding: 16px;
        border: 1px solid $strokeDefault;

        background: $darkGray900;

        &--appear {
            &-enter-active,
            &-leave-active {
                max-height: 250px;
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                max-height: 0;
                padding-top: 0;
                padding-bottom: 0;
                opacity: 0;
            }
        }

        &_list {
            .title_separator {
                background: white;
            }
        }

        &_items {
            container-type: inline-size;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        &_item {
            cursor: pointer;

            width: calc(11cqw - 8px * 11 / 12);
            height: 32px;
            border: 1px solid $darkGray400;
            border-radius: 4px;

            background: var(--color);

            transition: 0.3s;

            @container (width > 700px) {
                width: calc(6cqw - 8px * 6 / 5);
            }

            @include mobileOnly {
                width: calc(15cqw - 8px * 15 / 16);
            }

            &--active {
                border-color: $blue500;
                border-width: 2px;
            }

            &:hover {
                transform: scale(1.2);
                border-color: $lightGray600;
            }
        }

        &_color {
            cursor: pointer;

            width: 42px;
            min-width: 42px;
            height: 32px;
            padding: 0;
            border: 1px solid $darkGray400;
            border-radius: 4px;

            appearance: none;
            background: transparent;
            outline: 0;
            box-shadow: none;

            &::-webkit-color-swatch-wrapper {
                padding: 0;
                border: 0;
            }

            &::-webkit-color-swatch {
                border: 0;
                border-radius: 3px;
            }

            &::-moz-color-swatch {
                border: 0;
                border-radius: 3px;
            }
        }
    }
}
</style>
