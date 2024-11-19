<template>
    <div
        ref="select"
        class="select"
        :class="{
            'select--selected': activeItems.length,
            'select--opened': opened,
            'select--disabled': disabled,
        }"
        @click="opened = !opened"
    >
        <div
            class="select_container"
        >
            <div class="select__text">
                {{ shownValue }}
            </div>
            <div class="select__arrow">
                <arrow-top-icon/>
            </div>
        </div>
        <transition name="select_items--appear">
            <div
                v-if="opened"
                class="select_items"
                @click.stop
            >
                <div
                    v-for="item in items.filter(x => multiple || !activeItems.includes(x.value))"
                    :key="String(item.value)"
                    class="select__item"
                    @click="updateModel(item.value, !activeItems.includes(item.value))"
                >
                    <slot :item="item">
                        <template v-if="!multiple">
                            {{ item.text || String(item.value) }}
                        </template>
                        <common-checkbox
                            v-else
                            :model-value="activeItems.includes(item.value)"
                            @click.stop
                            @update:modelValue="updateModel(item.value, $event)"
                        >
                            {{ item.text || String(item.value) }}
                        </common-checkbox>
                    </slot>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import type { SelectItem, SelectItemValueType } from '~/types/components/select';
import CommonCheckbox from '~/components/common/basic/CommonCheckbox.vue';
import type { PropType } from 'vue';

const props = defineProps({
    width: {
        type: String,
        default: '240px',
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

defineSlots<{ default: (settings: { item: SelectItem }) => any }>();
const model = defineModel<SelectItemValueType | SelectItemValueType[]>({ required: true });
const opened = defineModel('opened', {
    type: Boolean,
    default: false,
});

const select = ref<HTMLDivElement | null>(null);
useClickOutside({
    element: select,
    callback: () => opened.value = false,
    strict: true,
});

const activeItems = computed<Array<SelectItemValueType>>(() => {
    if (Array.isArray(model.value)) return model.value;
    return model.value === null ? [] : [model.value];
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
    cursor: pointer;
    user-select: none;

    position: relative;
    z-index: 5;

    display: flex;
    align-items: center;
    justify-content: center;

    width: v-bind(width);
    max-width: 100%;

    font-size: 13px;
    line-height: 100%;
    color: $lightgray150;
    text-align: left;

    transition: 0.6s;

    &--disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    &_container, &__item {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &_container {
        position: relative;
        z-index: 9;

        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        width: 100%;
        height: 40px;
        padding: 0 16px;

        font-weight: 600;

        background: $darkgray900;
        border: 2px solid $darkgray950;
        border-radius: 8px;

        transition: 0.3s ease-in-out;
    }

    &__arrow {
        transform: rotate(180deg);
        width: 12px;
        min-width: 12px;
        transition: 0.3s ease-in-out;
    }


    &_items {
        cursor: initial;
        scrollbar-gutter: stable;

        position: absolute;
        z-index: 8;
        top: calc(100% - 2px);
        left: 0;

        overflow: auto;

        width: 100%;
        max-height: v-bind(maxDropdownHeight);
        padding: 8px;

        background: $darkgray900;
        border: 2px solid $darkgray950;
        border-top-color: $darkgray900 !important;
        border-radius: 0 0 8px 8px;

        &--appear {
            &-enter-active,
            &-leave-active {
                overflow: hidden;
                transition: 0.3s ease-in-out;
            }

            &-enter-from,
            &-leave-to {
                top: 20px;
                overflow: hidden;
                max-height: 0;
            }
        }
    }

    &--opened {
        z-index: 6;
        transition: 0s;

        .select {
            &__arrow {
                transform: rotate(0deg);
            }

            &_container {
                border-radius: 8px 8px 0 0;
            }

            &_container, &_items {
                border-color: $darkgray800;
            }
        }
    }

    &__item {
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: 0.3s;

        @include hover {
            &:hover {
                background: $darkgray850;
            }
        }
    }
}
</style>
