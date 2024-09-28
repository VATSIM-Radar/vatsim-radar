<template>
    <div class="color-picker">
        <common-tooltip
            v-model="tooltipOpened"
            close-method="clickOutside"
            location="bottom"
            max-width="100%"
            open-method="disabled"
            width="100%"
        >
            <template #activator>
                <div
                    class="color-picker__container"
                    @click="tooltipOpened = true"
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
                    <common-select
                        class="color-picker__transparency"
                        :items="transparencyOptions"
                        :model-value="model.transparency ?? 1"
                        placeholder="Transparency"
                        width="150px"
                        @click.stop
                        @update:modelValue="model = { ...model, transparency: +($event as string) }"
                    />
                    <div
                        class="color-picker__preview"
                        :style="{ '--color': getColorFromSettings(model) }"
                    />
                </div>
            </template>

            <div class="color-picker_input">
                <common-input-text
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
                    :style="{ '--color': hex }"
                    @click="model = { ...model, color }"
                />
            </div>
        </common-tooltip>
    </div>
</template>

<script setup lang="ts">
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';
import type { UserMapSettingsColor } from '~/server/api/user/settings/map';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { getColorFromSettings, hexToRgb, rgbToHex } from '~/composables/colors';
import { hexColorRegex } from '~/utils/shared';

defineSlots<{ default: () => any }>();

const model = defineModel({ type: Object as PropType<UserMapSettingsColor>, default: () => ({} as UserMapSettingsColor) });

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

    for (let i = 0.2; i <= 1; i += 0.1) {
        options.unshift({
            value: i,
            text: `${ Math.floor((1 - i) * 100) }%`,
        });
    }

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
    }

    &__content {
        flex: 1 0 auto;
    }

    &__preview {
        width: 32px;
        min-width: 32px;
        height: 32px;

        background: var(--color);
        border: 1px solid $lightgray200;
        border-radius: 8px;
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

            background: var(--color);
            border: 1px solid $darkgray800;
            border-radius: 4px;

            transition: 0.3s;

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
