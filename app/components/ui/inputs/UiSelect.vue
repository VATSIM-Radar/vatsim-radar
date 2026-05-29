<template>
    <div
        ref="select"
        class="select"
        @click.stop="opened = !opened"
    >
        <ui-input-text
            class="select_input"
            :disabled
            :focused="opened"
            :width
            @appendClick="emit('appendClick', $event)"
            @prependClick="emit('prependClick', $event)"
        >
            <template
                v-if="$slots.default"
                #default
            >
                <slot/>
            </template>

            <template #htmlContent>
                <div class="select__text">
                    {{ shownValue }}
                </div>
            </template>

            <template #append>
                <div class="select__append">
                    <div
                        v-if="$slots.append"
                        class="select__append_slot"
                    />
                    <ui-separator
                        v-if="$slots.append"
                        distance="0"
                        full
                    />
                    <div
                        class="select__expand-icon"
                        :class="{ 'select__expand-icon--expanded': opened }"
                    >
                        <arrow-top-icon/>
                    </div>
                    <transition name="select__dropdown--appear">
                        <ui-menu
                            v-if="opened && getItems.length"
                            class="select__dropdown"
                            item-padding="12px"
                            :items="getItems.map(x => ({ title: x.text ?? String(x.value), item: x, key: String(x.value), onClick: () => updateModel(x.value, !activeItems.includes(x.value)) }))"
                            @click.stop
                        >
                            <template #default="{ item: { item } }">
                                <ui-text type="3b">
                                    <template v-if="!multiple">
                                        {{ item.text || String(item.value) }}
                                    </template>
                                    <ui-checkbox
                                        v-else
                                        :model-value="activeItems.includes(item.value)"
                                        @click.stop
                                        @update:modelValue="updateModel(item.value, $event)"
                                    >
                                        {{ item.text || String(item.value) }}
                                    </ui-checkbox>
                                </ui-text>
                            </template>
                        </ui-menu>
                    </transition>
                </div>
            </template>
        </ui-input-text>
    </div>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import type { SelectItem, SelectItemValueType } from '~/types/components/select';
import UiCheckbox from '~/components/ui/inputs/UiCheckbox.vue';
import type { PropType } from 'vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiMenu from '~/components/ui/data/UiMenu.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiText from '~/components/ui/text/UiText.vue';

const props = defineProps({
    width: {
        type: String,
    },
    items: {
        type: Array as PropType<SelectItem[]>,
        required: true,
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    placeholder: {
        type: String,
    },
    /** showPlaceholder
      *
      * Switches between showing
      * the selected items or the
      * placeholder name.
      * @default false
      */
    showPlaceholder: {
        type: Boolean,
        default: false,
    },
    maxDropdownHeight: {
        type: String,
        default: '300px',
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
    prepend?: () => any;
    append?: () => any;
    item: (settings: { item: SelectItem }) => any;
    default?: () => any;
}>();

const model = defineModel<SelectItemValueType | SelectItemValueType[]>({ required: true });
const opened = defineModel('opened', {
    type: Boolean,
    default: false,
});

const select = useTemplateRef('select');
useClickOutside({
    element: select,
    callback: () => opened.value = false,
    strict: true,
    ignoreElements: ['.settings-page__item_left_title'],
});

const activeItems = computed<Array<SelectItemValueType>>(() => {
    if (Array.isArray(model.value)) return model.value;

    if (model.value === null) {
        if (props.items.some(x => x.value === null)) return [model.value];
        return [null];
    }

    return [model.value];
});

const getItems = computed(() => {
    return props.items.filter(x => props.multiple || !activeItems.value.includes(x.value));
});

const shownValue = computed<string>(() => {
    if (props.showPlaceholder) {
        return props.placeholder || '';
    }

    if (props.items && activeItems.value.length > 1) {
        return `${ activeItems.value.length } selected`;
    }

    const activeItem = props.items.find(x => activeItems.value.includes(x.value));

    return activeItem?.text || (activeItem?.value && String(activeItem.value)) || props.placeholder || '';
});

function updateModel(value: SelectItemValueType, add: boolean) {
    if (add) {
        if (Array.isArray(model.value)) model.value = [...model.value, value];
        else model.value = value;
    }
    else {
        if (Array.isArray(model.value)) model.value = model.value.filter(x => x !== value);
        else model.value = null;
    }

    opened.value = !!props.multiple;
}
</script>

<style scoped lang="scss">
.select {
    user-select: none;

    &_input {
        cursor: pointer;

        :deep(input) {
            display: none;
        }

        :deep(label) {
            cursor: pointer;
        }
    }

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
        top: calc(100% - 2px);
        left: -1px;

        overflow: auto;

        width: calc(100% + 2px);
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

    &__text {
        display: flex;
        align-items: center;
        height: 100%;
    }
}
</style>
