<template>
    <div class="favorite __info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{ friends: { title: 'Friends', disabled: !store.friends.length }, bookmarks: { title: 'Bookmarks', disabled: !store.bookmarks.length } }"
        />

        <view-user-list
            v-if="tab === 'friends'"
            :users="store.friends"
        />
        <div
            v-else
            class="bookmarks"
        >
            <div
                v-for="bookmark in store.bookmarks"
                :key="bookmark.id"
                class="bookmarks_bookmark"
                @click="[showBookmark(bookmark.json, map), store.menuFriendsOpen = false]"
            >
                <div class="bookmarks_bookmark_title">
                    {{ bookmark.name }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import ViewUserList from '~/components/views/ViewUserList.vue';
import { useStore } from '~/store';
import { showBookmark } from '~/composables/fetchers';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';

const tab = ref('friends');
const store = useStore();
const map = inject<ShallowRef<Map | null>>('map')!;

if (!store.friends.length || (store.localSettings.featuredDefaultBookmarks && store.bookmarks.length)) tab.value = 'bookmarks';
</script>

<style scoped lang="scss">
.bookmarks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;

    &_bookmark {
        cursor: pointer;
        padding: 10px;
        border-radius: 8px;
        background: $darkgray900;

        @include hover {
            transition: 0.3s;

            &:hover {
                background: $darkgray875;
            }
        }
    }
}
</style>
