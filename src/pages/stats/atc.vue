<template>
    <common-page-block container>
        <template #title>
            ATC
        </template>

        <view-stats-tabs page-title="ATC"/>

        <common-table
            clickable
            :data="list"
            :headers="[
                { key: 'cid', name: 'CID', width: 80, sort: true },
                { key: 'callsign', name: 'Callsign', width: 100,  sort: true },
                { key: 'frequency', name: 'Frequency', width: 100,  sort: true },
                { key: 'name', name: 'Name', sort: true },
                { key: 'logon_time', name: 'Time Online', width: 120, sort: (a: any, b: any, method) => {
                    const aData = new Date(a.logon_time).getTime()
                    const bData = new Date(b.logon_time).getTime()

                    return (method === 'desc' ? aData - bData : bData - aData)
                } },
                { key: 'actions', name: 'Actions', width: 120 },
            ]"
            item-key="callsign"
            mobile-width="800px"
            @click="$event.text_atis && mapStore.addAtcOverlay($event.callsign)"
        >
            <template #data-logon_time="{ item }">
                {{getATCTime(item)}}
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
        </common-table>

        <common-popup
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
                <common-copy-info-block
                    v-if="overlayAtc.text_atis"
                    auto-expand
                    class="atc__sections_section"
                    :text="getATIS(overlayAtc)?.join('\n')"
                >
                    ATIS
                </common-copy-info-block>
            </div>
        </common-popup>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import { useMapStore } from '~/store/map';
import ViewStatsTabs from '~/components/views/ViewStatsTabs.vue';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import { getATCTime } from '~/composables/atc';

const dataStore = useDataStore();
const mapStore = useMapStore();

mapStore.$reset();

const list = computed(() => {
    return [
        ...dataStore.vatsim.data.locals.value.map(x => x.atc),
        ...dataStore.vatsim.data.firs.value.map(x => x.controller),
        ...dataStore.vatsim.data.general.value?.sups ?? [],
    ];
});

const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'atc')?.data);
const overlayAtc = computed(() => list.value.find(x => x.callsign === overlayData.value?.callsign));
</script>
