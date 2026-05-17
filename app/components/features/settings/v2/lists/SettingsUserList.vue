<template>
    <div class="list">
        <div class="list_settings __vertical-group-16">
            <ui-setting-display>
                <template #title>
                    Name
                </template>

                <ui-input-text
                    v-model="localList.name"
                    placeholder="Name"
                />
            </ui-setting-display>
            <ui-setting-display>
                <template #title>
                    Color
                </template>

                <ui-input-color
                    color-only
                    :model-value="{ color: localList.color }"
                    @update:modelValue="localList.color = $event!.color as string"
                />
            </ui-setting-display>
            <ui-setting-display>
                <template #title>
                    Show in menu
                </template>

                <template #description>
                    Shows online users from this list in Favorite menu
                </template>

                <ui-toggle v-model="localList.showInMenu"/>
            </ui-setting-display>
        </div>
        <ui-table
            :data="localList.users"
            :headers="[{ name: 'User name', key: 'name' }, { name: 'Status', key: 'status' }, { name: 'Comment', key: 'comment' }, { key: 'actions' }]"
            item-key="id"
        >
            <template #data-name="{ item }">
                <div class="__vertical-group-4">
                    <span>{{item.name}}</span>
                    <ui-text
                        class="__horizontal-group-4"
                        :href="`https://stats.vatsim.net/stats/${ item.cid }`"
                        target="_blank"
                        type="3b"
                    >
                        <ui-bubble
                            dotted
                            type="primary-flat"
                        >{{item.cid}}
                        </ui-bubble>

                        <ui-button
                            icon-width="12px"
                            link-color="blue500"
                            type="link"
                        >
                            <external-icon width="10"/>
                        </ui-button>
                    </ui-text>
                </div>
            </template>
        </ui-table>
    </div>
</template>

<script setup lang="ts">
import type { UserList } from '~/utils/server/handlers/lists';
import type { UserSettings } from '~/utils/server/user';
import type { UserSettingsV2 } from '~/utils/settings/types';
import { handleSettingChange, onSettingChange } from '~/composables/settings/v2/utils';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiTable from '~/components/ui/data/UiTable.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiText from '~/components/ui/text/UiText.vue';
import ExternalIcon from '~/assets/icons/kit/external.svg?component';
import UiIcon from '~/components/ui/data/UiIcon.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';

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
if (props.list) Object.assign(localList.value, props.list);

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
