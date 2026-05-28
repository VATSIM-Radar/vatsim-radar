<template>
    <div
        class="setting"
        :class="{
            'setting--has-left': $slots.title || $slots.description ,
            'setting--disabled': disabled,
            'setting--left-grow': leftGrow,
        }"
    >
        <div
            v-if="$slots.title"
            class="setting_left"
        >
            <ui-text
                class="setting_left_title"
                type="2b-medium"
                @click="!disableLabelClick && labelClick($event)"
            >
                <span>
                    <slot name="title"/>
                </span>
                <ui-tooltip
                    v-if="$slots.hint"
                    location="right"
                >
                    <slot name="hint"/>
                </ui-tooltip>
            </ui-text>
            <ui-text
                v-if="$slots.description"
                class="setting_left_description"
                color="lightGray900"
                type="3b"
            >
                <slot name="description"/>
            </ui-text>
            <slot name="leftAppend"/>
        </div>
        <div class="setting_component">
            <slot/>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';

defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
    disableLabelClick: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default?(): any; title?(): any; description?(): any; hint?(): any; leftAppend?(): any }>();

const route = useRoute();

const leftGrow = computed(() => {
    return !route.path?.startsWith('/settings');
});

function labelClick(event: MouseEvent) {
    const setting = (event.target as HTMLDivElement).closest('.setting');

    if (!setting || setting.classList.contains('setting--disabled')) {
        return;
    }

    const component = setting.querySelector('[data-type="component"]') ??
        setting.querySelector('.setting_component > *');

    if (component) {
        const input = component.querySelector<HTMLInputElement>('input:not(:disabled)');

        if (input) input.focus();
        else if ('click' in component) (component as HTMLDivElement).click();
    }
}
</script>

<style lang="scss" scoped>
.setting {
    align-self: stretch;

    &_left {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_title {
            cursor: pointer;
            user-select: none;

            display: flex;
            gap: 8px;
            align-items: center;
        }
    }

    &--has-left {
        display: grid;
        grid-template-columns: 31% calc(100% - 31% - 24px);
        justify-content: space-between;
    }

    &--disabled .setting_component {
        pointer-events: none;
        opacity: 0.5;
    }

    &--left-grow {
        display: flex;
        gap: 24px;
        justify-content: space-between;

        .setting_component {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            flex-wrap: wrap;
            align-items: flex-end;
        }

        @at-root .setting:not(.setting--has-left) .setting_component {
            align-items: flex-start;
        }
    }
}
</style>
