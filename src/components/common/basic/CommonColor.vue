<template>
    <div class="color-picker">
        <common-tooltip
            close-method="clickOutside"
            location="bottom"
            max-width="100%"
            open-method="click"
            width="100%"
        >
            <template #activator>
                <div class="color-picker__container">
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
                    />
                    <div class="color-picker__preview"/>
                </div>
            </template>

            <div class="color-picker_list">
                <div
                    v-for="(hex, color) in colorsList"
                    :key="color"
                    class="color-picker_list_item"
                    :style="{ '--color': hex }"
                    @click="model.color = color"
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

const model = defineModel({ type: Object as PropType<UserMapSettingsColor>, default: () => ({} as UserMapSettingsColor) });

const themeColor = computed(() => getCurrentThemeHexColor(model.value.color as any));

const getColor = computed(() => {
    if (themeColor.value) return themeColor.value;
    return model.value.color ?? '#000';
});

const colorsList = Object.fromEntries(Object.entries(radarColors).filter(([key]) => key.endsWith('Hex')).map(([key, value]) => [key.replace('Hex', ''), value])) as Record<string, string>;

const transparencyOptions = computed<SelectItem[]>(() => {
    const options: SelectItem[] = [];

    for (let i = 0; i <= 1; i += 0.1) {
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
    min-height: 55vh;

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

        background: v-bind(getColor);
        border: 1px solid $lightgray200;
        border-radius: 8px;
    }

    &_list {
        container-type: inline-size;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        &_item {
            cursor: pointer;

            width: calc(10cqw - 4px * 9 / 10);
            height: calc(10cqw - 4px * 9 / 10);

            background: var(--color);
            border: 1px solid transparent;
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
