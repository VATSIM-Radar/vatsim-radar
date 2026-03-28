<template>
    <div class="menu">
        <ui-text
            v-for="(item, index) in items"
            :key="item.title+index"
            class="menu_item"
            type="2b"
            @click="item.onClick()"
        >
            <slot :item>
                {{item.title}}
            </slot>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    items: {
        type: Array as PropType<UIMenuItem[]>,
        required: true,
    },
    itemPadding: {
        type: String,
        default: '20px',
    },
});

defineSlots<{ default: (settings: { item: UIMenuItem }) => any }>();

export interface UIMenuItem {
    title: string;
    key?: string;
    onClick: () => any;
}
</script>

<style scoped lang="scss">
.menu {
    border-radius: 2px;

    &_item {
        cursor: pointer;
        padding: v-bind(itemPadding);
        color: $lightGray200;
        background: $darkGray900;

        &:not(:last-child) {
            border-bottom: 1px solid $whiteAlpha4;
        }

        @include hover {
            transition: 0.3s;

            &:hover {
                background: $whiteAlpha4;
            }
        }
    }
}
</style>
