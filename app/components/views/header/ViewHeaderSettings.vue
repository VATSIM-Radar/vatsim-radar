<template>
    <common-info-popup
        v-model="model"
        v-model:tab="store.settingsPopupTab"
        absolute
        class="settings"
        max-height="calc(100dvh - 56px - 92px - 20px)"
        shadow
        :tabs="{
            main: {
                title: 'Settings',
                sections: [
                    { title: 'VATSIM Account', key: 'account' },
                    { title: 'Navigraph Account', key: 'navigraph' },
                    { title: 'Preferences', key: 'follow' },
                ],
            },
            favorite: {
                title: 'Favorite Lists',
                sections: listsSections,
            },
        }"
    >
        <template #title>
            Settings
        </template>
        <template #account>
            <div class="settings__block settings__block--short-gap">
                <common-info-block>
                    <template #top>
                        <div class="settings__two-col-block">
                            <div class="settings__two-col-block_title">
                                VATSIM ID
                            </div>
                            <div class="settings__two-col-block_text">
                                {{ store.user!.cid }}
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <common-info-block>
                    <template #top>
                        <div class="settings__two-col-block">
                            <div class="settings__two-col-block_title">
                                Header Name<br>

                                <small>
                                    Customize shown header name.
                                    Leave blank for defaults.
                                </small>
                            </div>
                            <div class="settings__two-col-block_text">
                                <common-input-text
                                    :model-value="settings.headerName ?? ''"
                                    placeholder="Enter name"
                                    @change="settings.headerName = ($event.target as HTMLInputElement).value"
                                />
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <common-info-block>
                    <template #top>
                        Private Mode<br>

                        <small>
                            Hide from everyone following you using "Favorite Lists" feature. You will still be visible on map in "default" color, as well as searchable.
                        </small>
                    </template>
                    <template #bottom>
                        <template v-if="store.user!.privateMode">
                            <common-notification type="info">
                                Active until {{store.user!.privateUntil ? `${ formatterTime.format(new Date(store.user!.privateUntil)) }Z` : 'disabled'}}
                            </common-notification>
                            <common-toggle
                                model-value
                                @update:modelValue="setPrivateMode(false)"
                            >
                                Deactivate
                            </common-toggle>
                        </template>
                        <common-select
                            :items="[{ value: '1h' }, { value: '3h' }, { value: '6h' }, { value: '12h' }, { value: '24h' }, { value: '7d' }, { value: null, text: 'Until disabled' }]"
                            :model-value="null"
                            placeholder="Choose mode"
                            @update:modelValue="setPrivateMode($event as any)"
                        />
                    </template>
                </common-info-block>
                <common-button-group>
                    <common-button
                        :href="`https://stats.vatsim.net/stats/${ store.user!.cid }`"
                        target="_blank"
                    >
                        My stats
                    </common-button>
                    <common-button
                        class="settings__logout"
                        href="/api/user/logout"
                    >
                        Logout
                    </common-button>
                </common-button-group>
                <common-button
                    class="settings__delete"
                    type="link"
                    @click="store.deleteAccountPopup = true"
                >
                    Delete Account
                </common-button>
            </div>
        </template>
        <template #follow>
            <div class="settings__block settings__block--long-gap">
                <common-toggle v-model="settings.autoFollow">
                    Auto-follow me

                    <template #description>
                        Enabling this will auto-open info popup with your current flight and
                        enable tracking of it (on map load or when spawned on ground)
                    </template>
                </common-toggle>
                <common-toggle
                    v-model="settings.autoZoom"
                    :disabled="!settings.autoFollow"
                >
                    Auto-zoom to me

                    <template #description>
                        Enabling this will also zoom to your aicraft position (differs from
                        ground to airborne) on initial spawn/site open<br><br>
                        By default it will use last saved position
                    </template>
                </common-toggle>
                <common-toggle v-model="settings.showFullRoute">
                    Default to full route instead of remaining
                </common-toggle>
                <common-toggle v-model="settings.toggleAircraftOverlays">
                    Fast open multiple aircraft

                    <template #description>
                        By default, you have to pin aircraft overlay to keep it open - it will close otherwise. With this setting, it will stay open, and others will open minified.
                    </template>
                </common-toggle>
                <common-toggle v-model="settings.autoShowAirportTracks">
                    Auto-show airport tracks

                    <template #description>
                        Enabling this will auto-show aircraft tracks for any airport overlay you open.
                    </template>
                </common-toggle>
                <common-select
                    :items="[{ value: '12h' }, { value: '24h' }]"
                    :model-value="settings.timeFormat ?? '24h'"
                    @update:modelValue="settings.timeFormat = $event as any"
                >
                    <template #label>
                        Time format
                    </template>
                </common-select>
            </div>
        </template>
        <template #tab-favorite>
            <common-select
                :items="[
                    { text: 'Newest first (default)', value: 'newest' },
                    { text: 'Oldest first', value: 'oldest' },
                    { text: 'Name (ASC)', value: 'abcAsc' },
                    { text: 'Name (DESC)', value: 'abcDesc' },
                    { text: 'CID (ASC)', value: 'cidAsc' },
                    { text: 'CID (DESC)', value: 'cidDesc' },
                ]"
                :model-value="store.user!.settings.favoriteSort ?? null"
                placeholder="Sort"
                width="100%"
                @update:modelValue="saveSort"
            />
        </template>
        <template #new-list>
            <view-header-list
                :list="newList"
                @add="addList"
            />
        </template>
        <template
            v-for="(list, index) in store.lists"
            :key="list.id"
            #[list.id]
        >
            <view-header-list
                :last="index === store.lists.length - 1"
                :list
            />
        </template>
        <template #navigraph>
            <div class="settings__block settings__block--long-gap">
                <common-button
                    v-if="store.user?.hasFms === null"
                    href="/api/auth/navigraph/redirect"
                >
                    Link Navigraph
                </common-button>
                <div
                    v-else
                    class="settings__navigraph"
                    :class="{ 'settings__navigraph--unlimited': store.user!.hasFms }"
                >
                    <div class="settings__navigraph_title">
                        Status
                    </div>
                    <div class="settings__navigraph_status">
                        <template v-if="store.user!.hasCharts">
                            Unlimited
                        </template>
                        <template v-else-if="store.user!.hasFms">
                            Navigraph Data
                        </template>
                        <template v-else>
                            Standard
                        </template>
                    </div>
                    <common-button
                        class="settings__navigraph_unlink"
                        type="link"
                        @click="store.deleteNavigraphPopup = true"
                    >
                        Unlink
                    </common-button>
                </div>
                <div class="settings__description">
                    Users with linked Navigraph and Unlimited/Data subscription receive latest AIRAC for Navigational Data. Navigraph Unlimited members also get Airport Layouts feature.
                </div>
            </div>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import type { InfoPopupSection } from '~/components/common/popup/CommonInfoPopup.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { useStore } from '~/store';
import { defu } from 'defu';
import type { UserSettings } from '~/utils/backend/user';
import ViewHeaderList from '~/components/views/header/ViewHeaderList.vue';
import type { UserListLive } from '~/utils/backend/handlers/lists';
import { MAX_USER_LISTS } from '~/utils/shared';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

const model = defineModel({ type: Boolean, required: true });
const store = useStore();

const settings = reactive(defu<UserSettings, [UserSettings]>(store.user?.settings ?? {}, {
    autoFollow: false,
    autoZoom: false,
}));

const listsSections = computed<InfoPopupSection[]>(() => {
    const sections = store.lists.map(x => ({
        title: x.name,
        key: x.id.toString(),
        list: x,
        collapsible: true,
    })) satisfies InfoPopupSection[] as InfoPopupSection[];

    if (sections.length < MAX_USER_LISTS) {
        sections.push({
            title: 'New List',
            key: 'new-list',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

    return sections;
});

useClickOutside({
    element: () => document.querySelector('.info-popup'),
    callback: e => {
        model.value = false;
    },
});

watch(settings, () => {
    $fetch('/api/user/settings', {
        method: 'POST',
        body: settings,
    });
    store.user!.settings = settings;
});

const formatterTime = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
}));

const newList = reactive<UserListLive>({
    id: -1,
    name: '',
    type: 'OTHER',
    color: 'info500',
    users: [],
    showInMenu: false,
});

async function setPrivateMode(expiration: '1h' | '3h' | '6h' | '12h' | '24h' | '7d' | null | false) {
    if (expiration === false) {
        await $fetch('/api/user/private', {
            method: 'POST',
            body: {
                date: null,
                enabled: false,
            },
        });

        store.user!.privateMode = false;

        return;
    }

    let date: number | null = null;
    const currentDate = new Date();

    switch (expiration) {
        case '1h':
            date = currentDate.setHours(currentDate.getHours() + 1);
            break;
        case '3h':
            date = currentDate.setHours(currentDate.getHours() + 3);
            break;
        case '6h':
            date = currentDate.setHours(currentDate.getHours() + 6);
            break;
        case '12h':
            date = currentDate.setHours(currentDate.getHours() + 12);
            break;
        case '24h':
            date = currentDate.setHours(currentDate.getHours() + 24);
            break;
        case '7d':
            date = currentDate.setDate(currentDate.getDate() + 24);
            break;
    }

    await $fetch('/api/user/private', {
        method: 'POST',
        body: {
            date: date ? new Date(date).toISOString() : date,
            enabled: true,
        },
    });

    store.user!.privateMode = true;
    store.user!.privateUntil = date !== null ? new Date(date).toISOString() : date;
}

const saveSort = async (sort: any) => {
    await $fetch('/api/user/settings', {
        method: 'POST',
        body: {
            ...store.user!.settings,
            favoriteSort: sort,
        },
    });

    store.user!.settings.favoriteSort = sort as UserSettings['favoriteSort'];
};

async function addList() {
    await addUserList(newList);

    Object.assign(newList, {
        id: -1,
        name: '',
        type: 'OTHER',
        color: 'info500',
        users: [],
    });
}
</script>

<style scoped lang="scss">
.settings {
    top: calc(100% + 24px);
    right: -4px;

    @include mobileOnly {
        width: calc(100dvw - 96px) !important;
    }

    &__block {
        display: flex;
        flex-direction: column;

        >* {
            width: 100%;
        }

        &--short-gap {
            gap: 8px;
        }

        &--long-gap {
            gap: 16px;
        }
    }

    &__two-col-block {
        display: grid;
        grid-template-columns: repeat(2, 45%);
        justify-content: space-between;

        &_text {
            font-weight: normal;
        }
    }

    & :is(&__logout, &__delete):not(:hover, :focus, :active) {
        color: $error500;
    }

    & &__delete {
        justify-content: center;
    }

    &__description {
        font-size: 12px;
    }

    &__navigraph {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: space-between;

        font-size: 13px;
        font-weight: 600;
        color: $lightgray150;

        &--unlimited .settings__navigraph_status {
            color: $success500;
        }
    }
}
</style>
