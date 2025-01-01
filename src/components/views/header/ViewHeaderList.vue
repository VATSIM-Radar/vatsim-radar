<template>
    <div
        class="list __info-sections"
        :class="{ 'list--empty': !list.users.length && last }"
    >
        <common-input-text
            :model-value="list.name"
            @change="list.id !== -1 && editUserList({ id: list.id, name: ($event.target as HTMLInputElement).value })"
            @update:modelValue="list.name = $event"
        >
            Name
        </common-input-text>
        <common-button-group v-if="list.id !== -1 && (list.type !== 'FRIENDS' || list.users.length)">
            <common-button
                :disabled="list.type === 'FRIENDS'"
                @click="toDelete = true"
            >
                Delete
            </common-button>
            <common-button
                :disabled="!list.users.length"
                @click="toClear = true"
            >
                Clear
            </common-button>
        </common-button-group>

        <common-notification v-if="duplicateName">
            A list with this name already exists
        </common-notification>

        <common-color
            color-only
            :model-value="{ color: list.color }"
            @update:modelValue="list.id === -1 ? list.color = $event.color as string : editUserList({ id: list.id, color: $event.color })"
        >
            Color
        </common-color>

        <common-toggle
            :model-value="list.showInMenu"
            @update:modelValue="list.id === -1 ? list.showInMenu = $event : editUserList({ id: list.id, showInMenu: $event })"
        >
            Show in menu
            <template #description>
                Shows online users from this list in menu
            </template>
        </common-toggle>

        <common-button
            v-if="list.id === -1"
            :disabled="!list.name || duplicateName"
            @click="emit('add')"
        >
            Save
        </common-button>

        <view-user-list :list/>

        <common-popup
            v-model="toDelete"
            disable-teleport
            width="600px"
        >
            <template #title>
                Are you sure you want to delete {{ list.name }}?
            </template>

            This action cannot be undone.

            <template #actions>
                <common-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="deleteUserList(list)"
                >
                    Permanently delete list
                </common-button>
                <common-button @click="toDelete = false">
                    Cancel deletion
                </common-button>
            </template>
        </common-popup>
        <common-popup
            v-model="toClear"
            disable-teleport
            width="600px"
        >
            <template #title>
                Are you sure you want to clear {{ list.name }}?
            </template>

            All users will be removed from this list. This action cannot be undone.

            <template #actions>
                <common-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="editUserList({ id: list.id, users: []}).then(() => {
                        toClear = false
                    })"
                >
                    Remove all users from this list
                </common-button>
                <common-button @click="toClear = false">
                    Cancel that please
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import type { UserListLive } from '~/utils/backend/lists';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

import { useStore } from '~/store';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import ViewUserList from '~/components/views/ViewUserList.vue';

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
    add() {
        return true;
    },
});

const toDelete = ref(false);
const toClear = ref(false);
const store = useStore();

const duplicateName = computed(() => {
    return store.lists.some(x => x.id !== props.list.id && x.name.toLowerCase() === props.list.name.toLowerCase());
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
