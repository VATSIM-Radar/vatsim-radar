<template>
    <div
        class="list __info-sections"
        :class="{ 'list--empty': !list.users.length && last }"
    >
        <div  :class="{ 'list_settings-container': list.id !== -1 }">
            <common-block-title
                v-if="list.id !== -1"
                class="list_settings-title"
                :collapsed="activeListSettings !== list.id"
                remove-margin
                @update:collapsed="activeListSettings = !$event ? list.id : 0"
            >
                Settings
            </common-block-title>

            <div
                v-if="list.id === -1 || activeListSettings === list.id"
                class="__info-sections"
                :class="{ 'list_settings': list.id !== -1 }"
            >
                <common-button-group>
                    <common-button @click="toImport = true">
                        Import
                    </common-button>
                    <common-button
                        v-if="list.users.length"
                        @click="exportList"
                    >
                        Export
                    </common-button>
                    <common-button
                        v-if="list.users.length"
                        @click="copyCids.copy(list.users.map(x => x.cid).join(','))"
                    >
                        <template v-if="copyCids.copyState.value">
                            Copied!
                        </template>
                        <template v-else>
                            Copy CIDs
                        </template>
                    </common-button>
                </common-button-group>
                <common-button
                    v-if="list.users.length < MAX_LISTS_USERS"
                    size="S"
                    :type="userAddActive ? 'primary' : 'secondary'"
                    @click="userAddActive = !userAddActive"
                >
                    Add via CID
                </common-button>
                <common-notification
                    v-else
                    type="error"
                >
                    Max count of {{ MAX_LISTS_USERS }} is reached
                </common-notification>
                <div
                    v-if="userAddActive"
                    class="__info-sections users_add"
                >
                    <common-notification v-if="newUser.cid && store.lists.some(x => x.users.some(x => x.cid === newUser.cid))">
                        This user already exists in list {{ store.lists.find(x => x.users.some(x => x.cid === newUser.cid))?.name }}
                    </common-notification>
                    <div class="__section-group">
                        <common-input-text
                            :model-value="!newUser.cid ? '' : newUser.cid.toString()"
                            placeholder="CID"
                            @update:modelValue="newUser.cid = (isNaN(parseInt($event, 10)) || parseInt($event, 10) < 1) ? 0 : +parseInt($event, 10)"
                        />
                        <common-input-text
                            v-model="newUser.name"
                            placeholder="Name"
                        />
                    </div>
                    <common-input-text
                        v-model="newUser.comment"
                        placeholder="Comment"
                    />
                    <common-button
                        :disabled="!newUser.cid || !newUser.name || store.lists.some(x => x.users.some(x => x.cid === newUser.cid))"
                        size="S"
                        @click="[list!.id === 0 ? editUserList({ ...list, users: [newUser]}) : editUserList({ id: list!.id, users: [newUser, ...list.users!]}), resetNewUser()]"
                    >
                        Add user to list
                    </common-button>
                </div>
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
            </div>
        </div>

        <common-notification
            v-if="list.users.length"
            cookie-name="friends-click-tutorial"
            type="info"
        >
            Want to modify favorite user?<br> Just click on user's card!
        </common-notification>

        <view-user-list
            :key="String(store.user?.settings.favoriteSort)"
            :list
        />

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
        <common-popup
            v-model="toImport"
            disable-teleport
            width="600px"
        >
            <template #title>
                Import to {{ list.name }}
            </template>
            <div class="__info-sections">
                <common-block-title remove-margin>
                    VATSIM Radar JSON
                </common-block-title>
                <common-block-title remove-margin>
                    Import as file
                </common-block-title>
                <common-notification
                    cookie-name="vatspy-import"
                    type="info"
                >
                    <details>
                        <summary>
                            How to import VATSpy data?
                        </summary>
                        <ol>
                            <li>
                                Open <code>%AppData%</code> in Explorer
                            </li>
                            <li>
                                Locate VATSpyConfig.xml
                            </li>
                            <li>
                                Import it. You should have at least one filter with CIDs for it to work
                            </li>
                        </ol>
                    </details>
                </common-notification>
                <common-button @click="fileInput?.click()">
                    Import VATSpy XML or VATSIM Radar JSON
                </common-button>
                <input
                    v-show="false"
                    ref="fileImport"
                    accept="application/json,application/xml"
                    type="file"
                    @input="() => importFile()"
                >
                <common-block-title remove-margin>
                    Import as text
                </common-block-title>
                <common-input-text
                    v-model="importedText"
                    placeholder="1234567,1234567"
                    @change="[
                        importedText = (($event.target as HTMLInputElement).value).split(',').filter(x => !isNaN(parseInt(x.trim(), 10))).map(x => x.trim()).join(','),
                        importedList = importedText.split(',').map(x => ({ cid: +x, name: x })),
                    ]"
                >
                    Enter a list of comma-separated CIDs
                </common-input-text>
                <common-notification
                    v-if="(importedList.length + list.users.length) > MAX_LISTS_USERS"
                    type="error"
                >
                    Max count of {{ MAX_LISTS_USERS }} reached. Only {{ MAX_LISTS_USERS - list.users.length }} will be added.
                </common-notification>
            </div>
            <template #actions>
                <common-button
                    :disabled="!importedList.length"
                    @click="[importList(), toImport = false]"
                >
                    <template v-if="importedList.length">
                        Import {{ importedList.length }} users
                    </template>
                    <template v-else>
                        Import
                    </template>
                </common-button>
            </template>
        </common-popup>
        <common-popup
            disable-teleport
            :model-value="!!vatSpyImport"
            width="500px"
            @update:modelValue="vatSpyImport = null"
        >
            <template  #title>
                VATSpy import
            </template>
            <div class="list__vatspy-list">
                <common-select
                    v-if="vatSpyImport"
                    :items="vatSpyImport.map((x, index) => ({ value: index, text: `${ x.title } (#${ index + 1 })` }))"
                    max-dropdown-height="150px"
                    :model-value="null"
                    @update:modelValue="[
                        importedList = vatSpyImport![$event as number].cids.map(x => ({ cid: x, name: x.toString() })),
                        vatSpyImport = null,
                    ]"
                >
                    <template #label>
                        Select a list
                    </template>
                </common-select>
            </div>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import type { UserListLive, UserListUser } from '~/utils/backend/handlers/lists';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

import { useStore } from '~/store';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import ViewUserList from '~/components/views/ViewUserList.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { useFileDownload } from '~/composables/settings';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';

import { XMLParser } from 'fast-xml-parser';
import { MAX_LISTS_USERS } from '~/utils/shared';

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

interface VatspyFilter {
    title: string;
    cids: number[];
}

const toDelete = ref(false);
const toImport = ref(false);
const importedText = ref('');
const importedList = ref<UserListUser[]>([]);
const vatSpyImport = ref<VatspyFilter[] | null>(null);
const toClear = ref(false);
const store = useStore();
const activeListSettings = ref(0);
const fileInput = useTemplateRef<HTMLInputElement>('fileImport');

const duplicateName = computed(() => {
    return store.lists.some(x => x.id !== props.list.id && x.name.toLowerCase() === props.list.name.toLowerCase());
});

const userAddActive = ref(false);
const copyCids = useCopyText();

const newUser = reactive<UserListUser>({
    name: '',
    comment: '',
    cid: 0,
});

function resetNewUser() {
    Object.assign(newUser, {
        name: '',
        comment: '',
        cid: 0,
    });
    userAddActive.value = false;
}

function exportList() {
    useFileDownload({
        fileName: `vatsim-radar-favorite-${ props.list.name.toLowerCase() }-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(props.list.users.map(x => ({
            cid: x.cid,
            name: x.name,
            comment: x.comment || undefined,
        })))], { type: 'application/json' }),
    });
}

async function importList() {
    importedList.value = importedList.value.filter(x => !props.list.users.some(y => x.cid === y.cid)).slice(0, MAX_LISTS_USERS - props.list.users.length);

    console.log(props.list.id);

    await editUserList({
        ...props.list,
        users: [
            ...props.list.users,
            ...importedList.value,
        ],
    });
}

async function importFile() {
    const input = fileInput.value?.files?.[0];
    if (!input) return;

    const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener('load', async () => {
            resolve(reader.result as string);
        });

        reader.addEventListener('error', e => {
            reject(e);
        });

        reader.readAsText(input);
    });

    if (input.name.endsWith('.xml')) {
        const xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
        });

        console.log(xmlParser.parse(content).VATSpyConfig.Filters.Filter);

        vatSpyImport.value = xmlParser.parse(content).VATSpyConfig.Filters.Filter.map((x: any) => ({
            title: x.Name,
            cids: x.CIDs.string,
        }));
    }
    else if (input.name.endsWith('.json')) {
        const json = JSON.parse(content) as UserListUser[];

        if (!Array.isArray(json) || !json.every(x => typeof x.cid === 'number' && typeof x.name === 'string')) return;

        importedList.value = json.map(x => ({
            cid: x.cid,
            name: x.name,
            comment: typeof x.comment === 'string' ? x.comment : undefined,
        }));
    }
}

watch(() => JSON.stringify(props.list), val => {
    editUserList(props.list);
});
</script>

<style scoped lang="scss">
.list {
    &--empty {
        padding-bottom: 220px;
    }

    &_settings {
        padding-left: 12px;

        &-title {
            margin-left: 12px;
        }

        &-container {
            padding: 8px 4px;
            border: 1px solid varToRgba('lightgray125', 0.15);
            border-radius: 4px;
        }
    }

    &__vatspy-list {
        height: 200px;
    }
}
</style>
