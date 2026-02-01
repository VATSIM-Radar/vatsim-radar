<template>
    <div
        class="list __info-sections"
        :class="{ 'list--empty': !list.users.length && last }"
    >
        <div  :class="{ 'list_settings-container': list.id !== -1 }">
            <ui-block-title
                v-if="list.id !== -1"
                class="list_settings-title"
                :collapsed="activeListSettings !== list.id"
                remove-margin
                @update:collapsed="activeListSettings = !$event ? list.id : 0"
            >
                Settings
            </ui-block-title>

            <div
                v-if="list.id === -1 || activeListSettings === list.id"
                class="__info-sections"
                :class="{ 'list_settings': list.id !== -1 }"
            >
                <ui-button-group>
                    <ui-button @click="toImport = true">
                        Import
                    </ui-button>
                    <ui-button
                        v-if="list.users.length"
                        @click="exportList"
                    >
                        Export
                    </ui-button>
                    <ui-button
                        v-if="list.users.length"
                        @click="copyCids.copy(list.users.map(x => x.cid).join(','))"
                    >
                        <template v-if="copyCids.copyState.value">
                            Copied!
                        </template>
                        <template v-else>
                            Copy CIDs
                        </template>
                    </ui-button>
                </ui-button-group>
                <ui-button
                    v-if="list.users.length < MAX_LISTS_USERS"
                    size="S"
                    :type="userAddActive ? 'primary' : 'secondary'"
                    @click="userAddActive = !userAddActive"
                >
                    Add via CID
                </ui-button>
                <ui-notification
                    v-else
                    type="error"
                >
                    Max count of {{ MAX_LISTS_USERS }} is reached
                </ui-notification>
                <div
                    v-if="userAddActive"
                    class="__info-sections users_add"
                >
                    <ui-notification v-if="newUser.cid && store.lists.some(x => x.users.some(x => x.cid === newUser.cid))">
                        This user already exists in list {{ store.lists.find(x => x.users.some(x => x.cid === newUser.cid))?.name }}
                    </ui-notification>
                    <div class="__section-group">
                        <ui-input-text
                            :model-value="!newUser.cid ? '' : newUser.cid.toString()"
                            placeholder="CID"
                            @update:modelValue="newUser.cid = (isNaN(parseInt($event!, 10)) || parseInt($event!, 10) < 1) ? 0 : +parseInt($event!, 10)"
                        />
                        <ui-input-text
                            v-model="newUser.name"
                            placeholder="Name"
                        />
                    </div>
                    <ui-input-text
                        v-model="newUser.comment"
                        placeholder="Comment"
                    />
                    <ui-button
                        :disabled="!newUser.cid || !newUser.name || store.lists.some(x => x.users.some(x => x.cid === newUser.cid))"
                        size="S"
                        @click="[list!.id === 0 ? editUserList({ ...list, users: [newUser]}) : editUserList({ id: list!.id, users: [newUser, ...list.users!]}), resetNewUser()]"
                    >
                        Add user to list
                    </ui-button>
                </div>
                <ui-input-text
                    :model-value="list.name"
                    @change="list.id !== -1 && editUserList({ id: list.id, name: ($event.target as HTMLInputElement).value })"
                    @update:modelValue="list.name = $event!"
                >
                    Name
                </ui-input-text>
                <ui-button-group v-if="list.id !== -1 && (list.type !== 'FRIENDS' || list.users.length)">
                    <ui-button
                        :disabled="list.type === 'FRIENDS'"
                        @click="toDelete = true"
                    >
                        Delete
                    </ui-button>
                    <ui-button
                        :disabled="!list.users.length"
                        @click="toClear = true"
                    >
                        Clear
                    </ui-button>
                </ui-button-group>

                <ui-notification v-if="duplicateName">
                    A list with this name already exists
                </ui-notification>

                <ui-input-color
                    color-only
                    :model-value="{ color: list.color }"
                    @update:modelValue="list.id === -1 ? list.color = $event!.color as string : editUserList({ id: list.id, color: $event!.color })"
                >
                    Color
                </ui-input-color>

                <ui-toggle
                    :model-value="list.showInMenu"
                    @update:modelValue="list.id === -1 ? list.showInMenu = $event : editUserList({ id: list.id, showInMenu: $event })"
                >
                    Show in menu
                    <template #description>
                        Shows online users from this list in menu
                    </template>
                </ui-toggle>

                <ui-button
                    v-if="list.id === -1"
                    :disabled="!list.name || duplicateName"
                    @click="emit('add')"
                >
                    Save
                </ui-button>
            </div>
        </div>

        <ui-notification
            v-if="list.users.length"
            cookie-name="friends-click-tutorial"
            type="info"
        >
            Want to modify favorite user?<br> Just click on user's card!
        </ui-notification>

        <settings-favorite-users
            :key="String(store.user?.settings.favoriteSort)"
            :list
        />

        <popup-fullscreen
            v-model="toDelete"
            disable-teleport
            width="600px"
        >
            <template #title>
                Are you sure you want to delete {{ list.name }}?
            </template>

            This action cannot be undone.

            <template #actions>
                <ui-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="deleteUserList(list)"
                >
                    Permanently delete list
                </ui-button>
                <ui-button @click="toDelete = false">
                    Cancel deletion
                </ui-button>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
            v-model="toClear"
            disable-teleport
            width="600px"
        >
            <template #title>
                Are you sure you want to clear {{ list.name }}?
            </template>

            All users will be removed from this list. This action cannot be undone.

            <template #actions>
                <ui-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="editUserList({ id: list.id, users: []}).then(() => {
                        toClear = false
                    })"
                >
                    Remove all users from this list
                </ui-button>
                <ui-button @click="toClear = false">
                    Cancel that please
                </ui-button>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
            v-model="toImport"
            disable-teleport
            width="600px"
        >
            <template #title>
                Import to {{ list.name }}
            </template>
            <div class="__info-sections">
                <ui-block-title remove-margin>
                    VATSIM Radar JSON
                </ui-block-title>
                <ui-block-title remove-margin>
                    Import as file
                </ui-block-title>
                <ui-notification
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
                </ui-notification>
                <ui-button @click="fileInput?.click()">
                    Import VATSpy XML or VATSIM Radar JSON
                </ui-button>
                <input
                    v-show="false"
                    ref="fileImport"
                    accept="application/json,application/xml"
                    type="file"
                    @input="() => importFile()"
                >
                <ui-block-title remove-margin>
                    Import as text
                </ui-block-title>
                <ui-input-text
                    v-model="importedText"
                    placeholder="1234567,1234567"
                    @change="[
                        importedText = (($event.target as HTMLInputElement).value).split(',').filter(x => !isNaN(parseInt(x.trim(), 10))).map(x => x.trim()).join(','),
                        importedList = importedText.split(',').map(x => ({ cid: +x, name: x })),
                    ]"
                >
                    Enter a list of comma-separated CIDs
                </ui-input-text>
                <ui-notification
                    v-if="(importedList.length + list.users.length) > MAX_LISTS_USERS"
                    type="error"
                >
                    Max count of {{ MAX_LISTS_USERS }} reached. Only {{ MAX_LISTS_USERS - list.users.length }} will be added.
                </ui-notification>
            </div>
            <template #actions>
                <ui-button
                    :disabled="!importedList.length"
                    @click="[importList(), toImport = false]"
                >
                    <template v-if="importedList.length">
                        Import {{ importedList.length }} users
                    </template>
                    <template v-else>
                        Import
                    </template>
                </ui-button>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
            disable-teleport
            :model-value="!!vatSpyImport"
            width="500px"
            @update:modelValue="vatSpyImport = null"
        >
            <template  #title>
                VATSpy import
            </template>
            <div class="list__vatspy-list">
                <ui-select
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
                </ui-select>
            </div>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import type { UserListLive, UserListUser } from '~/utils/server/handlers/lists';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';

import { useStore } from '~/store';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import SettingsFavoriteUsers from '~/components/features/settings/SettingsFavoriteUsers.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import { useFileDownload } from '~/composables/settings';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';

import { XMLParser } from 'fast-xml-parser';
import { MAX_LISTS_USERS } from '~/utils/shared';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

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

        const parsedContent = xmlParser.parse(content).VATSpyConfig;

        const filters = Array.isArray(parsedContent.Filters.Filter) ? parsedContent.Filters.Filter : [parsedContent.Filters.Filter];

        const importedData = filters.map((x: any) => ({
            title: x.Name,
            cids: x.CIDs?.string,
        })).filter((x: any) => x.cids?.length);

        if (!filters.length) {
            alert('No VATSpy presets found');
            return;
        }

        if (importedData.length === 1) {
            importedList.value = importedData[0].cids.map((x: number) => ({ cid: x, name: x.toString() }));
        }
        else {
            vatSpyImport.value = importedData.map((x: any) => ({
                title: x.Name,
                cids: x.CIDs.string,
            }));
        }
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
