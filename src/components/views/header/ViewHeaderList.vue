<template>
    <div
        class="list __info-sections"
        :class="{ 'list--empty': list.users && last }"
    >
        <common-input-text
            :model-value="list.name"
            @change="list.name = ($event.target as HTMLInputElement).value"
        >
            Name
        </common-input-text>

        <common-color
            color-only
            :model-value="{ color: list.color }"
            @update:modelValue="list.color = $event.color!"
        >
            Color
        </common-color>

        <common-button
            v-if="list.id === -1"
            :disabled="!list.name"
            @click="$emit('save')"
        >
            Save
        </common-button>
    </div>
</template>

<script setup lang="ts">
import type { UserListLive } from '~/utils/backend/lists';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';

const props = defineProps({
    list: {
        type: Object as PropType<UserListLive>,
        required: true,
    },
    last: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    save() {
        return true;
    },
});

const dataStore = useDataStore();

const users = computed(() => {
    if (!props.list) return;
});

watch(() => props.list, val => {
    editUserList(val);
});
</script>

<style scoped lang="scss">
.list {
    &--empty {
        padding-bottom: 220px;
    }
}
</style>
