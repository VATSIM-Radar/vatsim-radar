<template>
    <ui-page-container container>
        <template #title>
            Observers
        </template>

        <stats-tabs/>

        <ui-table
            clickable
            :data="dataStore.vatsim.data.observers.value"
            :headers="[
                { key: 'cid', name: 'CID', width: 80, sort: true },
                { key: 'callsign', name: 'Callsign', width: 100,  sort: true },
                { key: 'name', name: 'Name', sort: true },
                { key: 'logon_time', name: 'Time Online', width: 120, sort: (a: any, b: any, method) => {
                    const aData = new Date(a.logon_time).getTime()
                    const bData = new Date(b.logon_time).getTime()

                    return (method === 'desc' ? aData - bData : bData - aData)
                } },
            ]"
            item-key="cid"
            mobile-width="1200px"
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
        </ui-table>

        <popup-fullscreen
            :model-value="!!overlayData"
            width="600px"
            @update:modelValue="!$event && (mapStore.overlays = [])"
        >
            <template #title>
                {{ overlayData!.pilot.callsign }}
            </template>

            <div class="__info-sections">
                <pilot-overlay-flight-info
                    class="__info-sections"
                    :pilot="overlayData!.pilot!"
                />
                <pilot-overlay-flight-plan
                    class="__info-sections"
                    :flight-plan="overlayData?.pilot?.flight_plan ?? null"
                    :status="overlayData!.pilot.status"
                    :stepclimbs="overlayData!.pilot.stepclimbs"
                />
            </div>
        </popup-fullscreen>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiTable from '~/components/ui/data/UiTable.vue';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { useMapStore } from '~/store/map';
import StatsTabs from '~/components/views/StatsTabs.vue';
import PilotOverlayFlightInfo from '~/components/map/overlays/pilot/PilotOverlayFlightInfo.vue';
import PilotOverlayFlightPlan from '~/components/map/overlays/pilot/PilotOverlayFlightPlan.vue';
import { getPilotStatus } from '~/composables/vatsim/pilots';
import { getATCTime } from '~/composables/vatsim/controllers';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const dataStore = useDataStore();
const mapStore = useMapStore();

mapStore.$reset();

const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'pilot')?.data);
</script>
