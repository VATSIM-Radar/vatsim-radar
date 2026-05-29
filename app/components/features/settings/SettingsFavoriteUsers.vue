<template>
    <div
        v-if="getUsers.length"
        class="users"
        :class="{ 'users--no-list': !list }"
    >
        <div
            v-for="user in sortedUsers"
            :key="user.cid"
            class="users_user"
            @click="activeUsers.has(user.cid) ? activeUsers.delete(user.cid) : activeUsers.add(user.cid)"
        >
            <div class="users_user-container">
                <div
                    class="users_user_status"
                    :class="{ 'users_user_status--online': user.type !== 'offline', 'users_user_status--hidden': user.hidden && store.user?.isSup }"
                />
                <div class="users_user_info">
                    <div class="users_user_info_name">
                        <div class="users_user_info_name_text">
                            {{ user.name }}
                        </div>
                        <ui-spoiler
                            is-cid
                            type="pilot"
                        >
                            ({{ user.cid }})
                        </ui-spoiler>
                    </div>
                    <settings-user-status :user/>
                    <ui-spoiler
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
                    </ui-spoiler>
                </div>
                <div
                    class="users_user_actions"
                    @click.stop
                >
                    <span v-if="store.lists.length > 1 && user.listName">
                        «{{ user.listName }}»
                    </span>
                    <ui-button
                        :href="`https://stats.vatsim.net/stats/${ user.cid }`"
                        icon-width="18px"
                        link-color="blue500"
                        target="_blank"
                        type="link"
                    >
                        <template #icon>
                            <stats-icon/>
                        </template>
                    </ui-button>
                    <ui-button
                        v-if="list"
                        icon-width="18px"
                        link-color="blue500"
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
                    </ui-button>
                </div>
            </div>
            <div
                v-if="list && activeUsers.has(user.cid)"
                class="users_user_edit"
                @click.stop
            >
                <ui-input-text
                    v-model="user.name"
                    @change="editUserList({ id: list.id, users: list.users })"
                />
                <ui-input-text
                    v-model="user.comment"
                    placeholder="Comment"
                    @change="editUserList({ id: list.id, users: list.users })"
                />
                <ui-radio-group
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
import StarIcon from '~/assets/icons/kit/star.svg?component';
import StarFilledIcon from '~/assets/icons/kit/star-filled.svg?component';
import StatsIcon from '~/assets/icons/kit/stats.svg?component';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';
import type { UserListLive, UserListLiveUser } from '~/utils/server/handlers/lists';
import { useStore } from '~/store';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import { sortList } from '~/composables/fetchers/lists';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import SettingsUserStatus from '~/components/features/settings/v2/lists/SettingsUserStatus.vue';

const props = defineProps({
    list: {
        type: Object as PropType<UserListLive>,
    },
    users: {
        type: Array as PropType<UserListLiveUser[]>,
    },
});

const store = useStore();
const featuredDefaultBookmarks = useSettingValueFromFunc('map.preferences.featuredDefaultBookmarks');
const activeUsers = reactive(new Set<number>());
const deletedUsers = reactive(new Set<number>());
const sortedUsers = shallowRef<UserListLiveUser[]>([]);
const isMobile = useIsMobile();

onBeforeUnmount(() => {
    if (deletedUsers.size) store.refreshUser();
});

const getUsers = computed(() => {
    return props.list?.users ?? props.users ?? [];
});

onMounted(() => {
    sortedUsers.value = sortList(getUsers.value);
});

watch(() => props.list?.users ?? props.users, () => {
    sortedUsers.value = sortList(getUsers.value);
}, {
    deep: true,
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
    border-radius: 8px;

    background: $darkGray800;

    &_user {
        &-container {
            cursor: pointer;
            user-select: none;

            display: flex;
            gap: 8px;
            justify-content: space-between;

            padding: 8px;
            border-radius: 4px;

            background: $darkGray700;

            @include mobileOnly {
                flex-wrap: wrap;
                justify-content: flex-start;
            }
        }

        &_status {
            position: relative;
            bottom: -4px;

            width: 8px;
            min-width: 8px;
            height: 8px;
            border-radius: 100%;

            background: $darkGray500;

            @include mobileOnly {
                order: 0;
            }

            &--online {
                background: $green500;
            }

            &--hidden {
                background: $red500;
            }
        }

        &_info {
            flex-grow: 1;
            font-size: 13px;
            line-height: 125%;

            @include mobileOnly {
                order: 2;
            }

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

                color: $blue500;
                text-decoration: underline;
                text-underline-offset: 3px;

                & + & {
                    width: 100%;
                }

                &--no-action {
                    cursor: default;
                    color: $lightGray400 !important;
                    text-decoration: none;
                }

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        color: $blue300;
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

            @include mobileOnly {
                order: 1;
                font-size: 12px;
            }
        }

        &_edit {
            display: flex;
            flex-direction: column;
            gap: 8px;

            margin-top: -2px;
            padding: 16px;
            border-radius: 0 0 4px 4px;

            background: $darkGray600;
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
