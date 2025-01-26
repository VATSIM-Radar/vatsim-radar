<template>
    <common-page-block>
        Airlines

        <div class="stats">
            <common-table
                :data="pilotSuggestions.airlines"
                :headers="[
                    { key: 'place', name: 'Place', sort: true },
                    { key: 'icao', name: 'ICAO', sort: true },
                    { key: 'count', name: 'Pilots' },
                    { key: 'name', name: 'Name', sort: true },
                    { key: 'callsign', name: 'Callsign', sort: true },
                    { key: 'virtual', name: 'Virtual', sort: true },
                ]"
                item-key="cid"
            />
        </div>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { RadarDataAirline } from '~/utils/backend/storage';

const dataStore = useDataStore();

await setupDataFetch();

type Airline = RadarDataAirline & { count: number };

const pilotSuggestions = computed<{ airlines: Airline[] }>(() => {
    const airlines: Record<string, Airline> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const airline = getAirlineFromCallsign(pilot.callsign);

        if (airline) {
            if (airlines[airline.icao]) airlines[airline.icao].count++;
            else {
                airlines[airline.icao] = {
                    ...airline,
                    count: 1,
                };
            }
        }
    }

    return {
        airlines: Object.values(airlines).sort((a, b) => b.count - a.count),
    };
});
</script>

<style scoped lang="scss">
.stats {

}
</style>
