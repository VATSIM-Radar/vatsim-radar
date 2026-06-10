<template>
    <div class="list __vertical-group-16">
        <div class="list_settings __vertical-group-16">
            <ui-setting-display>
                <template #title>
                    Name
                </template>

                <ui-input-text
                    v-model="localList.name"
                    placeholder="Name"
                    @change="save()"
                />
            </ui-setting-display>
            <ui-setting-display>
                <template #title>
                    Color
                </template>

                <ui-input-color
                    color-only
                    :model-value="{ color: localList.color }"
                    @update:modelValue="[localList.color = $event!.color as string, save()]"
                />
            </ui-setting-display>
            <ui-setting-display>
                <template #title>
                    Show in menu
                </template>

                <template #description>
                    Shows online users from this list in Favorite menu
                </template>

                <ui-toggle v-model="localList.showInMenu" @update:modelValue="save()"/>
            </ui-setting-display>
        </div>

        <ui-button-group>
            <ui-button @click="toImport = true">
                Import
            </ui-button>
            <ui-button
                :disabled="!localList.users.length"
                @click="exportList"
            >
                Export
            </ui-button>
            <ui-button
                v-if="localList.users.length"
                @click="copyCids.copy(localList.users.map(x => x.cid).join(','))"
            >
                <template v-if="copyCids.copyState.value">
                    Copied!
                </template>
                <template v-else>
                    Copy CIDs
                </template>
            </ui-button>
            <ui-button
                :disabled="localList.type === 'FRIENDS'"
                @click="deleteActive = true"
            >
                Delete
            </ui-button>
        </ui-button-group>

        <ui-button
            size="S"
            type="secondary-black"
            @click="activeEdit = { cid: -1, name: '', comment: '', type: 'new' }"
        >
            Add New
        </ui-button>

        <ui-table
            :data="localList.users"
            :headers="[{ name: 'User name', key: 'name' }, { name: 'Status', key: 'status' }, { name: 'Comment', key: 'comment' }, { key: 'actions', width: 48 }]"
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
            <template #data-status="{ item }">
                <div class="list_settings__status __horizontal-group-4">
                    <ui-badge :type="!item.type || item.type === 'offline' || item.type === 'new' ? 'offline' : 'online'"/>
                    <settings-user-status :user="item"/>
                </div>
            </template>
            <template #data-comment="{ item }">
                {{item.comment}}
            </template>
            <template #data-actions="{ item }">
                <div class="__horizontal-group-16">
                    <ui-button
                        hover-color="blue600"
                        link-color="blue500"
                        type="link"
                        @click="activeEdit = { ...item }"
                    >
                        <template #icon>
                            <edit-icon/>
                        </template>
                    </ui-button>
                    <ui-button
                        hover-color="red700"
                        link-color="red600"
                        type="link"
                        @click="[localList.users = localList.users.filter(x => x.cid !== item.cid), save()]"
                    >
                        <template #icon>
                            <close-icon/>
                        </template>
                    </ui-button>
                </div>
            </template>
        </ui-table>
        <popup-fullscreen
            :disabled="loading"
            :model-value="!!activeEdit"
            width="600px"
            @update:modelValue="activeEdit = null"
        >
            <template #title>
                {{activeEdit?.cid === -1 ? 'Create user' : `Edit ${ activeEdit?.name }`}}
            </template>

            <div v-if="activeEdit" class="__vertical-group-16">
                <ui-input-number
                    :disabled="activeEdit.type !== 'new'"
                    :input-attrs="{ min: 800000 }"
                    :model-value="activeEdit.cid === -1 ? null : activeEdit.cid"
                    @change="!activeEdit.name && (activeEdit.name = ($event.target as HTMLInputElement).value)"
                    @update:modelValue="activeEdit.cid = $event as number"
                >
                    CID
                </ui-input-number>
                <ui-input-text v-model="activeEdit.name">
                    Name
                </ui-input-text>
                <ui-input-text v-model="activeEdit.comment">
                    Comment
                </ui-input-text>
            </div>

            <template #actions>
                <ui-button-group v-if="activeEdit">
                    <ui-button :disabled="loading" @click="activeEdit = null">
                        Cancel
                    </ui-button>
                    <ui-button
                        :disabled="activeEdit.cid === -1 || !activeEdit.name || loading"
                        type="primary"
                        @click="[localList.users = [...localList.users.filter(x => x.cid !== activeEdit!.cid), activeEdit!], save().then(() => activeEdit = null)]"
                    >
                        Save
                    </ui-button>
                </ui-button-group>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
            v-model="toImport"
            disable-teleport
            width="600px"
        >
            <template #title>
                Import to {{ localList.name }}
            </template>
            <div class="__info-sections">
                <ui-block-title remove-margin>
                    Import as file
                </ui-block-title>
                <ui-notification type="info">
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
                <ui-button size="S" @click="fileInput?.click()">
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
                    v-if="(importedList.length + localList.users.length) > MAX_LISTS_USERS"
                    type="error"
                >
                    Max count of {{ MAX_LISTS_USERS }} reached. Only {{ MAX_LISTS_USERS - localList.users.length }} will be added.
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
            v-model="deleteActive"
            :disabled="loading"
            width="600px"
        >
            <template #title>
                Are you sure you want to delete {{ localList.name }}?
            </template>

            This action cannot be undone.

            <template #actions>
                <ui-button
                    :disabled="loading"
                    hover-color="red700"
                    primary-color="red500"
                    @click="deleteList()"
                >
                    Permanently delete list
                </ui-button>
                <ui-button  :disabled="loading" @click="deleteActive = false">
                    Cancel deletion
                </ui-button>
            </template>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import type { UserListLive, UserListLiveUser, UserListUser } from '~/utils/server/handlers/lists';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiTable from '~/components/ui/data/UiTable.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiText from '~/components/ui/text/UiText.vue';
import ExternalIcon from '~/assets/icons/kit/external.svg?component';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiBadge from '~/components/ui/data/UiBadge.vue';
import SettingsUserStatus from '~/components/features/settings/v2/lists/SettingsUserStatus.vue';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import { MAX_LISTS_USERS } from '~/utils/shared';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import { XMLParser } from 'fast-xml-parser';
import { useFileDownload } from '~/composables/settings';

const props = defineProps({
    list: {
        type: Object as PropType<UserListLive | null>,
        default: null,
    },
});

interface VatspyFilter {
    title: string;
    cids: number[];
}

const toImport = ref(false);
const importedText = ref('');
const importedList = ref<UserListUser[]>([]);
const vatSpyImport = ref<VatspyFilter[] | null>(null);
const copyCids = useCopyText();
const fileInput = useTemplateRef<HTMLInputElement>('fileImport');

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

async function importList() {
    importedList.value = importedList.value.filter(x => !localList.value.users.some(y => x.cid === y.cid)).slice(0, MAX_LISTS_USERS - localList.value.users.length);

    localList.value.users.push(...importedList.value as any[]);

    await save();
}

function exportList() {
    useFileDownload({
        fileName: `vatsim-radar-favorite-${ localList.value.name.toLowerCase() }-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(localList.value.users.map(x => ({
            cid: x.cid,
            name: x.name,
            comment: x.comment || undefined,
        })))], { type: 'application/json' }),
    });
}

const localList = ref<UserListLive>({
    id: -1,
    name: '',
    color: '',
    type: 'OTHER',
    showInMenu: true,
    users: [],
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss,vue/no-ref-object-reactivity-loss
if (props.list) Object.assign(localList.value, props.list);

const router = useRouter();
const isNew = computed(() => localList.value.id === -1);
const loading = ref(false);
const deleteActive = ref(false);

const activeEdit = ref<null | UserListLiveUser>(null);

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
        router.push({
            query: {
                list: undefined,
            },
        });
    }
    finally {
        loading.value = false;
    }
}
</script>
