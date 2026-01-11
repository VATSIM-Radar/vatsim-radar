<template>
    <div class="traffic __info-sections __info-sections--gap-16">
        <ui-tabs
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
                share: {
                    title: 'Share',
                },
            }"
        />

        <map-filters v-if="tab === 'filters'"/>
        <template v-else-if="tab === 'bookmarks'">
            <ui-toggle
                :model-value="!!store.localSettings.skipBookmarkAnimation"
                @update:modelValue="setUserLocalSettings({ skipBookmarkAnimation: $event })"
            >
                Disable animation
            </ui-toggle>
            <map-filters-presets
                :key="String(bookmarkSaveTick)"
                create-collapse
                create-reverse
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
                    <settings-bookmark-options
                        :id
                        :bookmark="preset"
                    />
                </template>
            </map-filters-presets>
        </template>
        <template v-else-if="tab === 'traffic'">
            <ui-toggle
                :model-value="!!store.localSettings.traffic?.disableFastUpdate"
                @update:modelValue="setUserLocalSettings({ traffic: { disableFastUpdate: $event } })"
            >
                Disable fast update
                <template #description>
                    Sets update to once per 15 seconds. Expected delay from 15 to 30 seconds, but it will consume much less traffic
                </template>
            </ui-toggle>
        </template>
        <template v-else-if="tab === 'share'">
            <ui-button
                size="S"
                @click="copyUrl"
            >
                <template v-if="copyState">
                    Copied!
                </template>
                <template v-else>
                    Copy current location
                </template>
            </ui-button>

            <ui-toggle v-model="includeOverlays">
                Include overlays
            </ui-toggle>

            <ui-input-text
                v-model="customUrl"
                placeholder="Paste copied URL"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import { useStore } from '~/store';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import { useMapStore } from '~/store/map';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import MapFilters from '~/components/map/settings/filters/MapFilters.vue';
import { MAX_BOOKMARKS } from '~/utils/shared';
import MapFiltersPresets from '~/components/map/settings/filters/MapFiltersPresets.vue';
import { sendUserPreset, showBookmark } from '~/composables/fetchers';
import type { UserBookmark } from '~/utils/backend/handlers/bookmarks';
import SettingsBookmarkOptions from '~/components/features/settings/SettingsBookmarkOptions.vue';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';

const store = useStore();
const mapStore = useMapStore();
const { copy, copyState } = useCopyText();

const includeOverlays = ref(false);
const customUrl = ref('');

const tab = ref('filters');

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

<style lang="scss" scoped>
.traffic :deep(.tabs_list) {
    gap: 4px;
    padding-right: 4px;
    padding-left: 4px;
}
</style>
