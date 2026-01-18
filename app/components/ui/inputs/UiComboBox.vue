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
                    :class="{ 'filter-box__add--focused': focused, 'filter-box__add--empty': !getSuggestions.length }"
                    @click="input?.focus()"
                >
                    <div class="filter-box__add_input">
                        <input
                            :id
                            ref="input"
                            v-model="receivedValue"
                            autocomplete="off"
                            :name="id"
                            :placeholder
                            :type="inputType ?? (isNumber ? 'number' : 'text')"
                            @blur="focused = false"
                            @change="updateModel(receivedValue)"
                            @focus="focused = true"
                            @input="receivedValue = receivedValue.toUpperCase()"
                        >
                    </div>
                    <transition name="filter-box__add_items--appear">
                        <div
                            v-if="focused && getSuggestions.length"
                            class="filter-box__add_items"
                            @click.stop
                        >
                            <div
                                v-for="suggestion in getSuggestions"
                                :key="String(suggestion.value)"
                                class="filter-box__add_items_item"
                                @click="updateModel(String(suggestion.value))"
                            >
                                {{suggestion.text || suggestion.value}}

                                <template v-if="suggestion.text && showChipValue">
                                    ({{suggestion.value}})
                                </template>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { SelectItem } from '~/types/components/select';
import CloseIcon from '~/assets/icons/basic/close.svg?component';
import { useStore } from '~/store';

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
    inputType: {
        type: String,
    },
    strict: {
        type: Boolean,
        default: false,
    },
    placeholder: {
        type: String,
        default: '',
    },
    alwaysShowText: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    default?(): any;
}>();

const store = useStore();
const id = useId();

const receivedValue = ref('');

const model = defineModel({ type: Array as PropType<Array<string | number>>, required: true });
const focused = defineModel('focused', { type: Boolean, default: false });
const input = useTemplateRef('input');

const getSuggestions = computed(() => {
    const byValue = props.suggestions.filter(x => !model.value.includes(x.value as any) && (
        !x.text ||
        typeof x.value !== 'string' ||
        x.value.toLowerCase().includes(receivedValue.value.toLowerCase())
    )).slice(0, 50);

    if (!byValue.length && (!store.datalistNotSupported || props.alwaysShowText)) {
        return props.suggestions.filter(x => !model.value.includes(x.value as any) && (
            !x.text ||
            x.text?.toLowerCase().includes(receivedValue.value.toLowerCase())
        )).slice(0, 50);
    }

    return byValue;
});

const updateModel = (value: string) => {
    receivedValue.value = '';

    if (props.isNumber) {
        const number = +value;

        if (props.strict && !props.suggestions.some(x => x.value === number)) {
            return;
        }

        if (!isNaN(number) && number > -2 && number < 999999999999999 && !model.value.some(x => x === number)) {
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
    &__add {
        cursor: text;

        position: relative;

        width: 100%;
        padding: 8px 12px;
        border: 2px solid transparent;
        border-radius: 8px;

        background: $darkgray900;

        transition: 0.3s;

        &--focused {
            border-color: $primary500 !important;
        }

        &--focused:not(&--empty) {
            border-radius: 8px 8px 0 0;
        }

        @include hover {
            &:hover {
                border-color: $darkgray800;
            }
        }

        &_input {
            input {
                width: 100%;
                border: none;

                font-family: $defaultFont;
                font-size: 13px;
                font-weight: 600;
                color:$lightgray150;

                appearance: none;
                background: transparent;
                outline: none;
                box-shadow: none;

                transition: 0.3s;

                &::placeholder {
                    color: varToRgba('lightgray150', 0.5);
                    opacity: 1
                }

                @include mobileSafariOnly {
                    font-size: 16px;
                }
            }
        }

        &_items {
            cursor: default;
            scrollbar-gutter: stable;

            position: absolute;
            z-index: 6;
            top: 100%;
            left: -2px;

            overflow: auto;

            width: calc(100% + 4px);
            max-height: 150px;
            border: solid $primary500;
            border-width: 1px 2px 2px;
            border-radius: 0 0 8px 8px;

            background: $darkgray900;

            &_item {
                cursor: pointer;

                padding: 8px 12px;

                font-family: $defaultFont;
                font-size: 13px;

                background: $darkgray900;

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        background: $darkgray875;
                    }
                }
            }

            &--appear {
                &-enter-active,
                &-leave-active {
                    opacity: 1;
                    transition: 0.3s;
                }

                &-enter-from,
                &-leave-to {
                    max-height: 0;
                    opacity: 0;
                }
            }
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
            border-radius: 4px;

            font-size: 12px;

            background: $darkgray875;

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
