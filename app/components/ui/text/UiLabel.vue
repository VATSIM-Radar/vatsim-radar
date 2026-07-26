<template>
    <div
        class="label"
        :class="[`label--headline-${ headlineType ?? 'none' }`]"
    >
        <div
            v-if="$slots.default"
            class="label_title"
        >
            <ui-text
                class="label_title_text"
                :type="textTypeTitle"
            >
                <slot/>
            </ui-text>
            <ui-tooltip
                v-if="$slots.tooltip"
                :location="tooltipLocation"
                :text-type="headlineType && headlineType !== 'XS' ? '3b' : undefined"
                :title-text-type="headlineType && headlineType !== 'XS' ? '3b-medium' : undefined"
            >
                <template #activator>
                    <div class="label_title_hint">
                        <slot name="tooltipActivator">
                            <question-icon :width="headlineType && headlineType !== 'XS' ? 16 : 12"/>
                        </slot>
                    </div>
                </template>
                <slot name="tooltip"/>
            </ui-tooltip>
        </div>
        <ui-text
            v-if="$slots.text"
            class="label_text"
            :type="textTypeText"
        >
            <slot name="text"/>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';
import QuestionIcon from 'assets/icons/basic/question.svg?component';

const props = defineProps({
    titleType: {
        type: String as PropType<UiTextTypes | null>,
        default: null,
    },
    textType: {
        type: String as PropType<UiTextTypes | null>,
        default: null,
    },
    tooltipLocation: {
        type: String as PropType<TooltipLocation>,
        default: 'bottom',
    },
    headlineType: {
        type: String as PropType<'L' | 'M' | 'S' | 'XS' | null>,
        default: null,
    },
});

defineSlots<{ default?(): any; text?(): any; tooltip?(): any; tooltipActivator?(): any }>();

const textTypeTitle = computed<UiTextTypes>(() => {
    if (props.titleType) return props.titleType;
    switch (props.headlineType) {
        case 'L':
            return 'h2';
        case 'M':
            return 'h3';
        case 'S':
            return 'h4';
        case 'XS':
            return 'h5-upper';
    }

    return '2b-medium';
});
const textTypeText = computed<UiTextTypes>(() => {
    if (props.textType) return props.textType;
    switch (props.headlineType) {
        case 'L':
        case 'M':
            return '3b';
        case 'S':
        case 'XS':
        default:
            return 'caption';
    }
});
</script>

<style scoped lang="scss">
.label {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &_title {
        display: flex;
        gap: 8px;
        align-items: center;
        color: $typographyPrimary;
    }

    &_text {
        color: $typographySecondary;
    }
}
</style>
