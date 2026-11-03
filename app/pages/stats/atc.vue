<template>
    <ui-page-container container>
        <template #title>
            ATC
        </template>

        <stats-tabs page-title="ATC"/>

        <stats-table
            :loading="loading"
            @range="loadRange"
        >
            <ui-table
                v-if="!range"
                clickable
                :data="list"
                :headers="[
                    { key: 'cid', name: 'CID', width: 80, sort: true },
                    { key: 'callsign', name: 'Callsign', width: 100,  sort: true },
                    { key: 'frequency', name: 'Frequency', width: 100,  sort: true },
                    { key: 'rating', name: 'Rating', width: 70,  sort: true },
                    { key: 'facility', name: 'Facility', width: 80,  sort: true },
                    { key: 'name', name: 'Name', sort: true },
                    { key: 'logon_time', name: 'Time Online', width: 120, sort: (a: any, b: any, method) => {
                        const aData = new Date(a.logon_time).getTime()
                        const bData = new Date(b.logon_time).getTime()

                        return (method === 'desc' ? aData - bData : bData - aData)
                    } },
                    { key: 'actions', name: 'Actions', width: 120 },
                ]"
                item-key="callsign"
                mobile-width="1000px"
                @click="$event.text_atis && mapStore.addAtcOverlay($event.callsign)"
            >
                <template #data-logon_time="{ item }">
                    {{getATCTime(item)}}
                </template>
                <template #data-rating="{ data }">
                    {{ ratings[(data as number).toString()] }}
                </template>
                <template #data-facility="{ item }">
                    {{ item.callsign.split('_')[item.callsign.split('_').length - 1] }}
                </template>
                <template #data-actions="{ item }">
                    <a
                        class="__link"
                        :href="`/?atc=${ item.callsign }`"
                        target="_blank"
                        @click.stop
                    >
                        View on map
                    </a>
                </template>
            </ui-table>

            <div v-else class="__vertical-group-16">
                <ui-toggle v-model="combined" align-left>Combined</ui-toggle>
                <ui-table
                    v-model:sort="sort"
                    :data="data ?? []"
                    :headers="[
                        { key: 'place', name: 'Place', width: 40 },
                        { key: 'key', name: displayedCombined ? 'Prefix' : 'Callsign', sort: true },
                        { key: 'duration', name: 'Time Online', sort: true },
                        { key: 'uptime', name: 'Uptime', sort: true },
                    ]"
                    item-key="key"
                    mobile-width="100%"
                >
                    <template #data-place="{ index }">
                        <div
                            v-if="!sort.length"
                            class="stats__place"
                            :class="[`stats__place--${ index }`]"
                        >
                            {{ index + 1 }}
                        </div>
                    </template>
                    <template #data-duration="{ data }">
                        {{ Math.floor(data / 3600000) }}h {{ Math.floor(data % 3600000 / 60000) }}m
                    </template>
                    <template #data-uptime="{ data }">
                        {{ data.toFixed(1) }}%
                    </template>
                </ui-table>
            </div>
        </stats-table>

        <popup-fullscreen
            :model-value="!!overlayData"
            width="600px"
            @update:modelValue="!$event && (mapStore.overlays = [])"
        >
            <template #title>
                {{ overlayData!.callsign }}
            </template>

            <div
                v-if="overlayAtc"
                class="__info-sections"
            >
                <ui-copy-info
                    v-if="overlayAtc.text_atis"
                    auto-expand
                    class="atc__sections_section"
                    :text="getATIS(overlayAtc, false)?.join('\n')"
                >
                    ATIS
                </ui-copy-info>
            </div>
        </popup-fullscreen>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiTable from '~/components/ui/data/UiTable.vue';
import type { TableSort } from '~/components/ui/data/UiTable.vue';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { useMapStore } from '~/store/map';
import StatsTabs from '~/components/views/StatsTabs.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import { getATCTime } from '~/composables/vatsim/controllers';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import StatsTable from '~/components/views/StatsTable.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import type { StatsATC, StatsRange } from '~/types/data/stats';

const dataStore = useDataStore();
const mapStore = useMapStore();
const { data, range, loading, load } = useHistoricalStats<StatsATC>('atc');
const combined = ref(false);
const displayedCombined = ref(false);
const sort = ref<TableSort[]>([]);

watch(data, value => {
    if (value) displayedCombined.value = combined.value;
});

mapStore.$reset();

const list = computed(() => {
    return [
        ...dataStore.vatsim.data.controllers.value.filter(x => !x.duplicated),
        ...dataStore.vatsim.data.general.value?.sups ?? [],
        ...dataStore.vatsim.data.general.value?.adm ?? [],
    ];
});

const ratings = Object.fromEntries(Object.entries(useRatingsIds()).map(([key, value]) => [value, key]));

const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'atc')?.data);
const overlayAtc = computed(() => list.value.find(x => x.callsign === overlayData.value?.callsign));

function loadRange(nextRange: StatsRange | null) {
    void load(nextRange, combined.value);
}

watch(combined, () => {
    if (range.value) void load(range.value, combined.value);
});
</script>
