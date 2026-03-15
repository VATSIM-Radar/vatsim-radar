<template>
    <ui-page-container>
        <template #title>
            Tooltips
        </template>

        <ui-select
            :items="[{ value: 'top' }, { value: 'bottom' }, { value: 'right' }, { value: 'left' }]"
            :model-value="tooltipSettings.location"
            @update:modelValue="tooltipSettings.location = $event as any"
        >
            <template #label>
                Location
            </template>
        </ui-select>
        <ui-select
            :items="[{ value: 'left' }, { value: 'right' }, { value: 'center' }]"
            :model-value="tooltipSettings.align"
            @update:modelValue="tooltipSettings.align = $event as any"
        >
            <template #label>
                Align
            </template>
        </ui-select>

        <div class="wrapper">
            <ui-tooltip v-bind="tooltipSettings">
                I am a tooltip
            </ui-tooltip>
            <ui-tooltip v-bind="tooltipSettings">
                <template #activator>
                    <ui-button>
                        Custom activator with a title
                    </ui-button>
                </template>
                <template #title>
                    Title
                </template>
                I am a tooltip
            </ui-tooltip>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipCloseMethod, TooltipLocation, TooltipOpenMethod } from '~/components/ui/data/UiTooltip.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';

const tooltipSettings = reactive({
    location: 'top' as TooltipLocation,
    align: 'center' as 'right' | 'left' | 'center',
    openMethod: 'mouseOver' as TooltipOpenMethod,
    closeMethod: 'mouseLeave' as TooltipCloseMethod,
});
</script>

<style lang="scss" scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>
