<template>
    <div
        class="list"
        :class="{ 'list--divider': circleDivider }"
        :style="gridOptions"
    >
        <ui-data-list-item
            v-for="(item, index) in items.filter(x => !x.hide && (x.title || x.text))"
            :key="item.key ?? index"
            class="list_item"
            :class="{ 'list_item--clickable': !!item.onClick }"
            :tooltip-location="item.tooltipLocation ?? tooltipLocation ?? 'top'"
            :tooltip-width="item?.tooltipWidth"
            @click="item.onClick?.()"
        >
            <slot
                v-if="!item.key || !$slots[`item-${ item.key }`]"
                :index
                :item
            >
                {{item.text}}
            </slot>
            <slot
                v-else
                :index
                :item
                :name="`item-${ item.key }`"
            />
            <template
                v-if="item.title || $slots.title || $slots[`item-title-${ item.key }`]"
                #title
            >
                <slot
                    v-if="$slots[`item-title-${ item.key }`]"
                    :index
                    :item
                    :name="`item-title-${ item.key }`"
                />
                <slot
                    v-else
                    :index
                    :item
                    name="title"
                >
                    {{item.title}}
                </slot>
            </template>
            <template
                v-if="item.tooltip || $slots.tooltip"
                #tooltip
            >
                <slot
                    :index
                    :item
                    name="tooltip"
                >
                    {{item.tooltip}}
                </slot>
            </template>
            <template
                v-if="item.tooltipTitle || $slots.tooltipTitle"
                #tooltipTitle
            >
                <slot
                    :index
                    :item
                    name="tooltipTitle"
                >
                    {{item.tooltipTitle}}
                </slot>
            </template>
        </ui-data-list-item>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';

export interface DataListItem {
    title?: string | number | null;
    text?: string | number | null;
    key?: string;
    tooltip?: string;
    tooltipTitle?: string;
    tooltipWidth?: string;
    tooltipLocation?: TooltipLocation;
    hide?: boolean;
    onClick?: () => any;
}

const props = defineProps({
    tooltipLocation: {
        type: String as PropType<TooltipLocation | null>,
        // Dynamic location
        default: null,
    },
    gridColumns: {
        type: Number,
        default: 0,
    },
    gap: {
        type: String,
        default: '8px 16px',
    },
    items: {
        type: Array as PropType<DataListItem[]>,
        required: true,
    },
    circleDivider: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    default?(options: SlotOptions): any;
    title?(options: SlotOptions): any;
    tooltip?(options: SlotOptions): any;
    tooltipTitle?(options: SlotOptions): any;
    [key: `item-${ string }`]: (options: SlotOptions) => any;
}>();

type SlotOptions = { item: DataListItem; index: number };

const horizontalGap = computed(() => {
    return props.gap.split(' ')[1];
});

const gridOptions = computed(() => {
    if (!props.gridColumns) return {};

    const templateColumns = `repeat(${ props.gridColumns }, calc(${ 100 / props.gridColumns }% - ${ props.gap.split(' ')[1] } * ${ props.gridColumns - 1 } / ${ props.gridColumns }))`;

    return {
        display: 'grid',
        gridTemplateColumns: templateColumns,
    };
});
</script>

<style scoped lang="scss">
.list {
    display: flex;
    flex-wrap: wrap;
    gap: v-bind(gap);
    align-items: center;

    &_item--clickable {
        cursor: pointer;
    }

    &--divider .list_item:not(:last-child) {
        position: relative;

        &::after {
            content: '';

            position: absolute;
            top: calc(50% - 1px);
            left: calc(100% + v-bind(horizontalGap) / 2 - 1px);

            width: 2px;
            height: 2px;
            border-radius: 100%;

            background: $whiteAlpha12
        }
    }
}
</style>
