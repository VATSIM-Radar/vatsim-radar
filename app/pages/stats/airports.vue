<template>
    <common-page-block
        class="airports"
        container
    >
        <template #title>
            Airports
        </template>

        <view-stats-tabs/>

        <common-table
            v-model:sort="sort"
            clickable
            :data="airports"
            :headers="[
                { key: 'place', name: 'Place', width: 40 },
                { key: 'icao', name: 'ICAO', width: 80, sort: true },
                { key: 'departing', name: 'Departing', width: 100,  sort: true },
                { key: 'arrived', name: 'Landed', width: 80,  sort: true },
                { key: 'departed', name: 'Departed', width: 90, sort: true },
                { key: 'arriving', name: 'Arriving', width: 80, sort: true },
                { key: 'name', name: 'Name', sort: true },
                { key: 'actions', name: 'Actions', width: 120 },
            ]"
            item-key="icao"
            @click="mapStore.addAirportOverlay($event.icao)"
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
            <template #data-actions="{ item }">
                <a
                    class="__link"
                    :href="`/?airport=${ item.icao }`"
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
                {{ overlayData!.icao }}
            </template>
            <airport-controllers/>
            <airport-aircraft/>
        </common-popup>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import type { TableSort } from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { MapAirport } from '~/types/map';
import type { VatSpyAirport } from '~/types/data/vatspy';
import { useMapStore } from '~/store/map';
import { provideAirport } from '~/composables/airport';
import AirportAircraft from '~/components/views/airport/AirportAircraft.vue';
import AirportControllers from '~/components/views/airport/AirportControllers.vue';
import ViewStatsTabs from '~/components/views/ViewStatsTabs.vue';
import CommonPopup from '~/components/common/popup/CommonPopup.vue';

const dataStore = useDataStore();
const mapStore = useMapStore();

mapStore.$reset();

type Airport = MapAirport & VatSpyAirport & { ground: number; departed: number; arriving: number; arrived: number; count: number };

const sort = ref<TableSort[]>([]);
const overlayData = computed(() => mapStore.overlays.find(x => x.type === 'airport')?.data);
provideAirport(overlayData);

const airports = computed<Airport[]>(() => {
    return dataStore.vatsim.data.airports.value.map(x => ({
        ...x,
        ...dataStore.vatspy.value?.data.keyAirports.realIcao[x.icao],
        departed: x.aircraft.departures?.length ?? 0,
        arriving: x.aircraft.arrivals?.length ?? 0,
        departing: x.aircraft.groundDep?.length ?? 0,
        arrived: x.aircraft.groundArr?.length ?? 0,
        count: Object.values(x.aircraft).reduce((sum, a) => sum + a.length, 0),
    })).filter(x => x.name).sort((a, b) => b.count - a.count) as unknown as Airport[];
});
</script>

<style lang="scss" scoped>
.airports {
    :deep(.table__data--type-departing) {
        color: $success500;
    }

    :deep(.table__data--type-arrived) {
        color: $error300;
    }

    :deep(.table__data--type-departed) {
        color: $primary500;
    }

    :deep(.table__data--type-arriving) {
        color: $warning500;
    }
}
</style>
