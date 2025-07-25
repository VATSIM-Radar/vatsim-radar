<template>
    <common-button
        :hover-color="cleared ? 'success700' : 'error700'"
        :primary-color="cleared ? 'success500' : 'error500'"
        size="S"
        @click="clear()"
    >
        <slot v-if="!cleared">
            Clear
        </slot>
        <template v-else>
            Done!
        </template>
    </common-button>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';

const props = defineProps({
    data: {
        type: String as PropType<'vatspy' | 'controllers' | 'simaware' | 'vatglasses' | 'all'>,
        required: true,
    },
});

defineSlots<{ default?(): any }>();

const loading = ref(false);
const cleared = ref(false);

const clear = async () => {
    loading.value = true;
    try {
        await $fetch(`/api/data/custom/${ props.data }`, {
            method: 'DELETE',
        });

        cleared.value = true;
        await sleep(2000);
        cleared.value = false;
    }
    finally {
        loading.value = false;
    }
};
</script>
