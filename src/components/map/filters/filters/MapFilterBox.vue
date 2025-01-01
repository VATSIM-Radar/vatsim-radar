<template>
    <div class="filter-box">
        <div class="__grid-info-sections __grid-info-sections--vertical">
            <div class="__grid-info-sections_title">
                <slot/>
            </div>
            <div class="filter-box_container">
                <div
                    v-if="model.length"
                    class="filter-box__chips"
                >
                    <div
                        v-for="chip in model"
                        :key="chip"
                        class="filter-box__chips_chip"
                    >
                        <div class="filter-box__chips_chip_text">
                            {{ showChipValue ? chip : suggestions.find(x => x.value === chip)?.text ?? chip }}
                        </div>
                        <div class="filter-box__chips_chip_delete">
                            <close-icon
                                @click="model = model.filter(x => x !== chip)"
                            />
                        </div>
                    </div>
                </div>
                <div
                    v-if="!strict || suggestions.some(x => !model.includes(x.value as any))"
                    class="filter-box__add"
                >
                    <input
                        v-model="receivedValue"
                        :list="id"
                        :type="isNumber ? 'number' : 'text'"
                        @change="updateModel(($event.target as HTMLInputElement).value)"
                    >
                    <datalist :id>
                        <option
                            v-for="suggestion in suggestions.filter(x => !model.includes(x.value as any))"
                            :key="String(suggestion.value)"
                            :value="suggestion.value"
                        >
                            {{ suggestion.text }}
                        </option>
                    </datalist>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { SelectItem } from '~/types/components/select';
import CloseIcon from '@/assets/icons/basic/close.svg?component';

const props = defineProps({
    suggestions: {
        type: Array as PropType<SelectItem[]>,
        default: () => ([]),
    },
    showChipValue: {
        type: Boolean,
        default: false,
    },
    isNumber: {
        type: Boolean,
        default: false,
    },
    strict: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    default?(): any;
}>();

const id = useId();

const receivedValue = ref('');

const model = defineModel({ type: Array as PropType<Array<string | number>>, required: true });

const updateModel = (value: string) => {
    receivedValue.value = '';

    if (props.isNumber) {
        const number = +value;

        if (props.strict && !props.suggestions.some(x => x.value === number)) {
            return;
        }

        if (!isNaN(number) && number > 0 && number < 999999999999999 && !model.value.some(x => x === number)) {
            model.value = [
                ...model.value,
                number,
            ];
        }

        return;
    }

    if (props.strict && !props.suggestions.some(x => x.value === value)) return;

    if (value.trim() && !model.value.some(x => (x as string).trim().toLowerCase() === value.trim().toLowerCase())) {
        model.value = [
            ...model.value,
            value,
        ];
    }
};
</script>

<style scoped lang="scss">
.filter-box {
    input {
        width: 100%;
        padding: 8px 12px;

        font-family: $defaultFont;
        font-size: 13px;
        font-weight: 600;
        color:$lightgray150;

        appearance: none;
        background: $darkgray900;
        border: none;
        border: 2px solid transparent;
        border-radius: 8px;
        outline: none;
        box-shadow: none;

        transition: 0.3s;

        &::placeholder {
            color: varToRgba('lightgray150', 0.5);
            opacity: 1
        }

        &:focus {
            border-color: $primary500 !important;
        }

        @include hover {
            &:hover {
                border-color: $darkgray800;
            }
        }

        @include mobileSafariOnly {
            font-size: 16px;
        }
    }

    &__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;

        &_chip {
            user-select: none;

            display: flex;
            gap: 8px;
            align-items: center;

            padding: 4px 8px;

            font-size: 12px;

            background: $darkgray875;
            border-radius: 4px;

            &_delete {
                cursor: pointer;
                width: 10px;

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        color: $error400;
                    }
                }
            }
        }
    }
}
</style>
