<template>
    <ui-page-container container>
        <template #title>
            ATC
        </template>

        <stats-tabs page-title="ATC"/>

        <ui-table
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
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { useMapStore } from '~/store/map';
import StatsTabs from '~/components/views/StatsTabs.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import { getATCTime } from '~/composables/atc';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const dataStore = useDataStore();
const mapStore = useMapStore();

mapStore.$reset();

const list = computed(() => {
    return [
        ...dataStore.vatsim.data.locals.value.map(x => x.atc).filter(x => !x.atis_code && !x.duplicated),
        ...dataStore.vatsim.data.firs.value.map(x => x.controller).filter(x => !x.duplicated),
        ...dataStore.vatsim.data.general.value?.sups ?? [],
        ...dataStore.vatsim.data.general.value?.adm ?? [],
    ];
});

const ratings = Object.fromEntries(Object.entries(useRatingsIds()).map(([key, value]) => [value, key]));

const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'atc')?.data);
const overlayAtc = computed(() => list.value.find(x => x.callsign === overlayData.value?.callsign));
</script>
