<template>
    <div
        class="list"
        :style="gridOptions"
    >
        <ui-data-list-item
            v-for="(item, index) in items"
            :key="item.key ?? index"
            class="list_item"
            :class="{ 'list_item--clickable': !!item.onClick }"
            :tooltip-location="item.tooltipLocation ?? tooltipLocation ?? 'top'"
            @click="item.onClick?.()"
        >
            <slot
                :index
                :item
            >
                {{item.text}}
            </slot>
            <template
                v-if="item.title || $slots.title"
                #title
            >
                <slot
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
    title?: string;
    text?: string | number | null;
    key?: string;
    tooltip?: string;
    tooltipTitle?: string;
    tooltipLocation?: TooltipLocation;
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
});

defineSlots<{
    default?(options: SlotOptions): any;
    title?(options: SlotOptions): any;
    tooltip?(options: SlotOptions): any;
    tooltipTitle?(options: SlotOptions): any;
}>();

type SlotOptions = { item: DataListItem; index: number };

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

    &_item--clickable {
        cursor: pointer;
    }
}
</style>
