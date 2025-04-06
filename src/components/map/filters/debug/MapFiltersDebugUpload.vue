<template>
    <div class="debug-upload">
        <common-button
            :hover-color="model ? 'success700' : undefined"
            :primary-color="model ? 'success500' : undefined"
            size="S"
            :type="model ? 'primary' : 'secondary'"
            @click="file?.click()"
        >
            <template #icon>
                <import-icon/>
            </template>
            <slot v-if="!model"/>
            <template v-else>
                {{model.name}}
            </template>
        </common-button>
        <input
            v-show="false"
            :key="String(!!model)"
            ref="file"
            :accept
            type="file"
            @input="saveModel"
        >
    </div>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import ImportIcon from '@/assets/icons/kit/import.svg?component';

defineProps({
    accept: {
        type: String,
    },
});

defineSlots<{ default?(): any }>();

const model = defineModel({
    type: Object as PropType<File | null>,
    default: null,
});

const file = useTemplateRef<HTMLInputElement>('file');

const saveModel = () => {
    model.value = file.value?.files?.[0] ?? null;
    triggerRef(model);
};
</script>

<style scoped lang="scss">
.debug-upload {

}
</style>
