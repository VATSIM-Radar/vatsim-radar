<template>
    <div class="list-item">
        <div
            v-if="$slots.title"
            class="list-item_title"
        >
            <ui-text
                class="list-item_title_text"
                type="caption-light"
            >
                <slot name="title"/>
            </ui-text>
            <ui-tooltip
                v-if="$slots.tooltip"
                class="list-item_title_tooltip"
                :location="tooltipLocation"
            >
                <template
                    v-if="$slots.tooltipTitle"
                    #title
                >
                    <slot name="tooltipTitle"/>
                </template>
                <slot name="tooltip"/>
            </ui-tooltip>
        </div>
        <ui-text
            v-if="$slots.default"
            class="list-item_text"
            type="3b-medium"
        >
            <slot/>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    tooltipLocation: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
});

defineSlots<{
    default?(): any;
    title?(): any;
    tooltip?(): any;
    tooltipTitle?(): any;
}>();
</script>

<style scoped lang="scss">
.list-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    color: $lightGray200;
    overflow-wrap: anywhere;

    &_title {
        display: flex;
        gap: 4px;
        align-items: flex-start;
    }
}
</style>
