<template>
    <common-page-block container>
        <template #title>
            Pilots
        </template>

        <view-stats-tabs/>

        <common-table
            clickable
            :data="dataStore.vatsim.data.pilots.value"
            :headers="[
                { key: 'cid', name: 'CID', width: 80, sort: true },
                { key: 'callsign', name: 'Callsign', width: 100,  sort: true },
                { key: 'name', name: 'Name', sort: true },
                { key: 'status', name: 'Status', width: 80,  sort: true },
                { key: 'aircraft_short', name: 'Aircraft', width: 90, sort: true },
                { key: 'departure', name: 'Departure', width: 90, sort: true },
                { key: 'arrival', name: 'Arrival', width: 80, sort: true },
                { key: 'logon_time', name: 'Time Online', width: 120, sort: (a: any, b: any, method) => {
                    const aData = new Date(a.logon_time).getTime()
                    const bData = new Date(b.logon_time).getTime()

                    return (method === 'desc' ? aData - bData : bData - aData)
                } },
                { key: 'actions', name: 'Actions', width: 120 },
            ]"
            item-key="cid"
            multiple-sort
            @click="mapStore.addPilotOverlay($event.cid)"
        >
            <template #data-status="{ data }">
                <span :style="{ color: radarColors[`${ getPilotStatus(data).color }Hex`] }">
                    {{ getPilotStatus(data).title }}
                </span>
            </template>
            <template #data-logon_time="{ item }">
                {{getATCTime(item)}}h
            </template>
            <template #data-aircraft_short="{ data }">
                {{data && data.split('/')[0]}}
            </template>
            <template #data-departure="{ data, item }">
                {{data || item.airport}}
            </template>
            <template #data-actions="{ item }">
                <a
                    class="__link"
                    :href="`/?pilot=${ item.callsign }`"
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
                {{ overlayData!.pilot.callsign }}
            </template>

            <div class="__info-sections">
                <map-popup-flight-info
                    class="__info-sections"
                    :pilot="overlayData!.pilot!"
                />
                <map-popup-flight-plan
                    class="__info-sections"
                    :flight-plan="overlayData?.pilot?.flight_plan ?? null"
                    :status="overlayData!.pilot.status"
                    :stepclimbs="overlayData!.pilot.stepclimbs"
                />
            </div>
        </common-popup>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import { useMapStore } from '~/store/map';
import ViewStatsTabs from '~/components/views/ViewStatsTabs.vue';
import MapPopupFlightInfo from '~/components/map/popups/MapPopupFlightInfo.vue';
import MapPopupFlightPlan from '~/components/map/popups/MapPopupFlightPlan.vue';
import { getPilotStatus } from '~/composables/pilots';
import { getATCTime } from '~/composables/atc';

const dataStore = useDataStore();
const mapStore = useMapStore();

mapStore.$reset();

const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'pilot')?.data);
</script>
