<template>
    <div class="traffic __info-sections __info-sections--gap-16">
        <common-tabs
            v-model="tab"
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
            <common-block-title remove-margin>
                Share
            </common-block-title>

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
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { useMapStore } from '~/store/map';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import MapFilter from '~/components/map/filters/filters/MapFilter.vue';

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
