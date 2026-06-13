<template>
    <div class="filter-box">
        <ui-input-text
            v-model:focused="focused"
            :input-type="inputType ?? isNumber ? 'number' : 'text'"
            :model-value="(!focused && model.length) ? model.join(', ') : receivedValue"
            :placeholder
            @appendClick="[(focused = !focused), emit('appendClick', $event)]"
            @change="updateModel(receivedValue)"
            @prependClick="emit('prependClick', $event)"
            @update:modelValue="!focused ? undefined : (receivedValue = typeof $event === 'string' ? $event.toUpperCase() : ($event ?? ''))"
        >
            <slot/>

            <template
                v-if="$slots.prepend"
                #prepend
            >
                <slot name="prepend"/>
            </template>

            <template v-if="getSuggestions.length" #append>
                <div class="filter-box__append">
                    <div
                        v-if="$slots.append"
                        class="filter-box__append_slot"
                    />
                    <ui-separator
                        v-if="$slots.append"
                        distance="0"
                        full
                    />
                    <div
                        class="filter-box__expand-icon"
                        :class="{ 'filter-box__expand-icon--expanded': focused }"
                    >
                        <arrow-top-icon/>
                    </div>
                    <transition name="filter-box__dropdown--appear">
                        <ui-menu
                            v-if="focused && getSuggestions.length"
                            class="filter-box__dropdown"
                            item-padding="12px"
                            :items="getSuggestions.map(x => ({ title: x.text ?? String(x.value), suggestion: x, key: String(x.value), onClick: () => updateModel(String(x.value)) }))"
                            @click.stop
                        >
                            <template #default="{ item: { suggestion } }">
                                <ui-text type="3b">
                                    {{suggestion.text || suggestion.value}}

                                    <template v-if="suggestion.text && showChipValue">
                                        ({{suggestion.value}})
                                    </template>
                                </ui-text>
                            </template>
                        </ui-menu>
                    </transition>
                </div>
            </template>

            <template
                v-if="!focused && model.length"
                #htmlContent
            >
                <div class="filter-box__chips">
                    <ui-chip
                        v-for="(chip, index) in model"
                        :key="String(chip) + index"
                        model-value
                        @click.stop
                        @update:modelValue="model = model.filter(x => x !== chip)"
                    >
                        {{suggestions.find(x => x.value === chip)?.text ?? chip}}
                    </ui-chip>
                </div>
            </template>
        </ui-input-text>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { SelectItem } from '~/types/components/select';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import { useStore } from '~/store';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiMenu from '~/components/ui/data/UiMenu.vue';
import UiText from '~/components/ui/text/UiText.vue';

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

const emit = defineEmits({
    prependClick(settings: { event: Event; input: HTMLInputElement | null }) {
        return true;
    },
    appendClick(settings: { event: Event; input: HTMLInputElement | null }) {
        return true;
    },
});

defineSlots<{
    default?(): any;
    prepend?: () => any;
    append?: () => any;
}>();

const store = useStore();

const receivedValue = ref('');

const model = defineModel({ type: Array as PropType<Array<string | number>>, required: true });
const focused = defineModel('focused', { type: Boolean, default: false });

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
    focused.value = false;

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
    &__append {
        display: flex;
        align-items: stretch;
    }

    &__expand-icon {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 16px;
        height: 40px;

        svg {
            transform: rotate(180deg);
            width: 12px;
            height: 12px;
            transition: 0.3s;
        }

        &--expanded svg {
            transform: rotate(0);
        }
    }

    &__dropdown {
        position: absolute;
        z-index: 6;
        top: calc(100% - 1px);
        left: 0;

        overflow: auto;

        width: 100%;
        max-height: 180px;
        border: 1px solid $darkGray100;
        border-top-color: $whiteAlpha12;
        border-radius: 0 0 2px 2px;

        &--appear {
            &-enter-active,
            &-leave-active {
                transition: 0.3s ease-in-out;
            }

            &-enter-from,
            &-leave-to {
                top: calc(100% - 20px);
                opacity: 0;
            }
        }
    }

    &__chips {
        overflow: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;

        height: 100%;
        padding: 4px 0;
    }
}
</style>
