<template>
    <div class="traffic __info-sections __info-sections--gap-16">
        <common-tabs
            v-model="tab"
            mobile-vertical
            :tabs="{
                filters: {
                    title: 'Filters',
                },
                bookmarks: {
                    title: 'Bookmarks',
                },
                traffic: {
                    title: 'Traffic',
                },
            }"
        />

        <map-filter v-if="tab === 'filters'"/>
        <template v-else-if="tab === 'bookmarks'">
            <common-tabs
                v-model="bookmarksTab"
                :tabs="{
                    bookmarks: {
                        title: 'Bookmarks',
                    },
                    share: {
                        title: 'Page Share',
                    },
                }"
            />

            <template v-if="bookmarksTab === 'bookmarks'">
                <common-toggle
                    :model-value="!!store.localSettings.skipBookmarkAnimation"
                    @update:modelValue="setUserLocalSettings({ skipBookmarkAnimation: $event })"
                >
                    Disable animation
                </common-toggle>
                <map-filters-presets
                    :key="String(bookmarkSaveTick)"
                    disable-actions
                    endpoint-suffix="bookmarks"
                    has-share
                    :max-presets="MAX_BOOKMARKS"
                    no-confirm
                    :presets="store.bookmarks"
                    :refresh="() => store.fetchBookmarks()"
                    :selected-preset="activeBookmark"
                    type="bookmark"
                    @create="createBookmark"
                    @reset="activeBookmark = defaultBookmark()"
                    @save="applyBookmark"
                >
                    <template #title>
                        New Bookmark
                    </template>

                    <template #data="{ preset, id }">
                        <common-bookmark-data
                            :id
                            :bookmark="preset"
                        />
                    </template>
                </map-filters-presets>
            </template>
            <template v-else-if="bookmarksTab === 'share'">
                <common-button
                    size="S"
                    @click="copyUrl"
                >
                    <template v-if="copyState">
                        Copied!
                    </template>
                    <template v-else>
                        Copy current location
                    </template>
                </common-button>

                <common-toggle v-model="includeOverlays">
                    Include overlays
                </common-toggle>

                <common-input-text
                    v-model="customUrl"
                    placeholder="Paste copied URL"
                />
            </template>
        </template>
        <template v-else-if="tab === 'traffic'">
            <common-toggle
                :model-value="!!store.localSettings.traffic?.disableFastUpdate"
                @update:modelValue="setUserLocalSettings({ traffic: { disableFastUpdate: $event } })"
            >
                Disable fast update
                <template #description>
                    Sets update to once per 15 seconds. Expected delay from 15 to 30 seconds, but it will consume much less traffic
                </template>
            </common-toggle>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { useMapStore } from '~/store/map';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import MapFilter from '~/components/map/filters/filters/MapFilter.vue';
import { MAX_BOOKMARKS } from '~/utils/shared';
import MapFiltersPresets from '~/components/map/filters/MapFiltersPresets.vue';
import { sendUserPreset, showBookmark } from '~/composables/fetchers';
import type { UserBookmark } from '~/utils/backend/handlers/bookmarks';
import CommonBookmarkData from '~/components/common/vatsim/CommonBookmarkData.vue';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';

const store = useStore();
const mapStore = useMapStore();
const { copy, copyState } = useCopyText();

const includeOverlays = ref(false);
const customUrl = ref('');

const tab = ref('filters');
const bookmarksTab = ref('bookmarks');

const copyUrl = () => {
    let text = location.href;

    if (includeOverlays.value) {
        const url = new URL(location.href);
        url.searchParams.delete('overlay[]');
        for (const overlay of mapStore.overlays) {
            url.searchParams.append('overlay[]', `type=${ overlay.type };key=${ overlay.key };sticky=${ Number(overlay.sticky) };collapsed=${ Number(overlay.collapsed) }`);
        }

        text = url.toString();
    }

    copy(text);
};

const createBookmark = async (name: string, json: UserBookmark) => {
    await sendUserPreset(name, json, 'bookmarks', () => createBookmark(name, json));
    await store.fetchBookmarks();
    bookmarkSaveTick.value++;
    activeBookmark.value = json;
    await sleep(2000);
    activeBookmark.value = defaultBookmark();
};

const defaultBookmark = () => ({ zoom: 14, internal: true } as UserBookmark);
const activeBookmark = ref<UserBookmark>(defaultBookmark());
const bookmarkSaveTick = ref(0);
const map = inject<ShallowRef<Map | null>>('map')!;

const applyBookmark = async (bookmark: UserBookmark) => {
    showBookmark(bookmark, map.value);

    activeBookmark.value = bookmark;
    await sleep(2000);
    activeBookmark.value = defaultBookmark();
};

watch(customUrl, val => {
    if (!val) return;

    try {
        const url = new URL(val);
        if (!url.searchParams.size) throw new Error('Invalid params count');

        document.location.href = `${ location.origin }?${ url.searchParams.toString() }`;
    }
    catch (e) {
        console.error(e);
        customUrl.value = '';
    }
});
</script>
