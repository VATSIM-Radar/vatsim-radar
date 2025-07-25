<template>
    <details
        v-if="!visible"
        :open="model"
    >
        <summary @click.prevent.stop="model = true">
            <slot name="name">
                <template v-if="isCid">
                    CID
                </template>
                <template v-else>
                    Name
                </template>
            </slot>
        </summary>

        <slot/>
    </details>
    <slot v-else/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';

const props = defineProps({
    type: {
        type: String as PropType<'pilot' | 'controller'>,
        required: true,
    },
    isCid: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{
    default(): any;
    name(): any;
}>();

const model = defineModel({ type: Boolean });

const store = useStore();

const visible = computed(() => {
    return store.mapSettings.visibility?.[props.type === 'pilot' ? 'pilotsInfo' : 'atcInfo'] !== true;
});
</script>

<style lang="scss" scoped>
summary {
    cursor: pointer;
    user-select: none;
}

details {
    display: inline;
}

details[open] summary {
    display: none;
}
</style>
