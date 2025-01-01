<template>
    <div
        v-if="getUsers.length"
        class="users"
        :class="{ 'users--no-list': !list }"
    >
        <common-button
            v-if="!list"
            size="S"
            type="secondary"
            @click="[store.settingsPopup = true, store.settingsPopupTab = 'favorite']"
        >
            Management
        </common-button>

        <div
            v-for="user in sortedUsers"
            :key="user.cid"
            class="users_user"
            @click="activeUsers.has(user.cid) ? activeUsers.delete(user.cid) : activeUsers.add(user.cid)"
        >
            <div class="users_user-container">
                <div
                    class="users_user_status"
                    :class="{ 'users_user_status--online': user.type !== 'offline' }"
                />
                <div class="users_user_info">
                    <div class="users_user_info_name">
                        <div class="users_user_info_name_text">
                            {{ user.name }}
                        </div>
                        <common-spoiler
                            is-cid
                            type="pilot"
                        >
                            ({{ user.cid }})
                        </common-spoiler>
                    </div>
                    <div
                        v-if="user.type !== 'offline'"
                        class="users_user_info_status"
                        :class="{ 'users_user_info_status--no-action': user.type === 'sup' }"
                        @click.stop="store.settingsPopup = false"
                    >
                        <div
                            v-if="user.type === 'pilot'"
                            class="users_user__btn"
                            @click="[mapStore.addPilotOverlay(user.cid.toString()), map && showPilotOnMap(user.data, map)]"
                        >
                            <template v-if="user.data.status === 'depGate' || user.data.status === 'depTaxi'">
                                Departing from {{ user.data.departure }}
                            </template>
                            <template v-else-if="user.data.status === 'arrGate' || user.data.status === 'arrTaxi'">
                                Arrived to {{ user.data.arrival }}
                            </template>
                            <template v-else-if="user.data.status === 'departed'">
                                Departed from {{ user.data.departure }}
                            </template>
                            <template v-else-if="user.data.status === 'arriving'">
                                Arriving to {{ user.data.arrival }}
                            </template>
                            <template v-else>
                                Flying from {{ user.data.departure }} to {{ user.data.arrival }}
                            </template>
                            as {{ user.data.callsign }}
                        </div>
                        <div
                            v-else-if="user.type === 'prefile'"
                            class="users_user__btn"
                            @click="[mapStore.addPrefileOverlay(user.cid.toString())]"
                        >
                            Preparing for a flight from {{ user.data.departure }} to {{user.data.arrival}} as {{ user.data.callsign }}
                        </div>
                        <div
                            v-else-if="user.type === 'atc'"
                            class="users_user__btn"
                            @click="[mapStore.addAtcOverlay(user.data.callsign), map && showAtcOnMap(user.data, map)]"
                        >
                            Controlling as {{ user.data.callsign }}
                        </div>
                        <div
                            v-else-if="user.type === 'sup'"
                            class="users_user__btn users_user__btn--no-action"
                            @click.stop
                        >
                            SUPing ({{ user.data.callsign }})
                        </div>
                    </div>
                    <common-spoiler
                        v-if="user.comment"
                        class="users_user_info_comment"
                        type="pilot"
                    >
                        <div class="users_user_info_comment">
                            {{ user.comment }}
                        </div>

                        <template #name>
                            Comment
                        </template>
                    </common-spoiler>
                </div>
                <div
                    class="users_user_actions"
                    @click.stop
                >
                    <span v-if="store.lists.length > 1 && user.listName">
                        «{{ user.listName }}»
                    </span>
                    <common-button
                        :href="`https://stats.vatsim.net/stats/${ user.cid }`"
                        icon-width="18px"
                        link-color="primary500"
                        target="_blank"
                        type="link"
                    >
                        <template #icon>
                            <stats-icon/>
                        </template>
                    </common-button>
                    <common-button
                        v-if="list"
                        icon-width="18px"
                        link-color="primary500"
                        type="link"
                        @click="deletedUsers.has(user.cid)
                            ? [deletedUsers.delete(user.cid), editUserList({ id: list.id, users: list.users.filter(x => !deletedUsers.has(x.cid)) }, false)]
                            : [deletedUsers.add(user.cid), editUserList({ id: list.id, users: list.users.filter(x => !deletedUsers.has(x.cid)) }, false)]"
                    >
                        <template #icon>
                            <star-filled-icon
                                v-if="!deletedUsers.has(user.cid)"
                            />
                            <star-icon
                                v-else
                            />
                        </template>
                    </common-button>
                </div>
            </div>
            <div
                v-if="list && activeUsers.has(user.cid)"
                class="users_user_edit"
                @click.stop
            >
                <common-input-text
                    v-model="user.name"
                    @change="editUserList({ id: list.id, users: list.users })"
                />
                <common-input-text
                    v-model="user.comment"
                    placeholder="Comment"
                    @change="editUserList({ id: list.id, users: list.users })"
                />
                <common-radio-group
                    v-if="store.lists.length > 1"
                    :items="store.lists.map(x => ({ value: x.id, text: x.name, key: x.id.toString() }))"
                    :model-value="list.id"
                    two-cols
                    @update:modelValue="[
                        editUserList({ id: list.id, users: list.users.filter(x => x.cid !== user.cid) }),
                        editUserList({ id: $event as number, users: [user, ...store.lists.find(x => x.id === $event)!.users]}),
                    ]"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import StarIcon from '@/assets/icons/kit/star.svg?component';
import StarFilledIcon from '@/assets/icons/kit/star-filled.svg?component';
import StatsIcon from '@/assets/icons/kit/stats.svg?component';
import { showPilotOnMap } from '~/composables/pilots';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import type { UserListLive, UserListLiveUser } from '~/utils/backend/handlers/lists';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import { sortList } from '~/composables/fetchers/lists';

const props = defineProps({
    list: {
        type: Object as PropType<UserListLive>,
    },
    users: {
        type: Array as PropType<UserListLiveUser[]>,
    },
});

const store = useStore();
const mapStore = useMapStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const activeUsers = reactive(new Set<number>());
const deletedUsers = reactive(new Set<number>());
const sortedUsers = shallowRef<UserListLiveUser[]>([]);

onBeforeUnmount(() => {
    if (deletedUsers.size) store.refreshUser();
});

const getUsers = computed(() => {
    return props.list?.users ?? props.users ?? [];
});

onMounted(() => {
    sortedUsers.value = sortList(getUsers.value);
});

if (!props.list) {
    watch(getUsers, () => {
        sortedUsers.value = sortList(getUsers.value);
    });
}
</script>

<style scoped lang="scss">
.users {
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;

    max-height: 240px;
    padding: 8px;

    background: $darkgray950;
    border-radius: 8px;

    &_user {
        &-container {
            cursor: pointer;
            user-select: none;

            display: flex;
            gap: 8px;
            justify-content: space-between;

            padding: 8px;

            background: $darkgray900;
            border-radius: 4px;

            @include mobileOnly {
                flex-wrap: wrap;
            }
        }

        &_status {
            position: relative;
            bottom: -4px;

            width: 8px;
            min-width: 8px;
            height: 8px;

            background: $darkgray850;
            border-radius: 100%;

            &--online {
                background: $success500;
            }
        }

        &_info {
            flex-grow: 1;
            font-size: 13px;
            line-height: 125%;

            &_name {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            &_comment {
                font-size: 12px;
                font-weight: 300;
            }

            &_status {
                cursor: pointer;

                display: inline-block;

                color: $primary500;
                text-decoration: underline;
                text-underline-offset: 3px;

                &--no-action {
                    cursor: default;
                    color: $lightgray125 !important;
                    text-decoration: none;
                }

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        color: $primary300;
                    }
                }
            }
        }

        &_actions {
            display: flex;
            gap: 16px;
            align-items: center;

            .button {
                width: auto !important;
                height: auto !important;
            }
        }

        &_edit {
            display: flex;
            flex-direction: column;
            gap: 8px;

            margin-top: -2px;
            padding: 16px;

            background: $darkgray875;
            border-radius: 0 0 4px 4px;
        }
    }

    &--no-list {
        .users_user-container {
            cursor: default;
            user-select: unset;
        }

        @include mobileOnly {
            max-height: unset;
        }
    }
}
</style>
