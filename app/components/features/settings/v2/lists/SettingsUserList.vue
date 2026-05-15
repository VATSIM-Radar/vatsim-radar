<template>
    <div class="list"/>
</template>

<script setup lang="ts">
import type { UserList } from '~/utils/server/handlers/lists';
import type { UserSettings } from '~/utils/server/user';
import type { UserSettingsV2 } from '~/utils/settings/types';
import { handleSettingChange, onSettingChange } from '~/composables/settings/v2/utils';

const props = defineProps({
    list: {
        type: Object as PropType<UserList | null>,
        default: null,
    },
});

defineEmits({
    save() {
        return true;
    },
});

const localList = ref<UserList>({
    id: -1,
    name: '',
    color: '',
    type: 'OTHER',
    showInMenu: true,
    users: [],
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
if (props.list) Object.assign(localList, props.list);

const settingsStore = useSettingsStore();
const isNew = computed(() => localList.value.id === -1);
const loading = ref(false);
const deleteActive = ref(false);

async function save() {
    loading.value = true;
    try {
        if (isNew.value) {
            await addUserList(localList.value);
        }
        else {
            await editUserList(localList.value);
        }
    }
    finally {
        loading.value = false;
    }
}

async function deleteList() {
    loading.value = true;

    try {
        await deleteUserList(localList.value);
    }
    finally {
        loading.value = false;
    }
}

async function saveSort(sort: UserSettingsV2['appearance']['favoriteSort']) {
    loading.value = true;

    try {
        await settingsStore.save({
            appearance: {
                favoriteSort: sort,
            },
        });
    }
    finally {
        loading.value = false;
    }
}
</script>

<style scoped lang="scss">
.list {

}
</style>
