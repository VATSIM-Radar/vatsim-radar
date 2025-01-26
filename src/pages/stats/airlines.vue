<template>
    <common-page-block container>
        <template #title>
            Airlines
        </template>

        <!-- TODO stats -->
        <common-table
            v-model:sort="sort"
            :data="pilotSuggestions.airlines"
            :headers="[
                { key: 'place', name: 'Place', width: 40 },
                { key: 'icao', name: 'ICAO', width: 60, sort: true },
                { key: 'count', name: 'Pilots', width: 60,  sort: true },
                { key: 'callsign', name: 'Callsign', sort: true },
                { key: 'name', name: 'Name', sort: true },
                { key: 'virtual', name: 'Virtual', width: 70, sort: true },
                { key: 'actions', name: 'Actions', width: 80 },
            ]"
            item-key="cid"
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
            <template #data-virtual="{ data }">
                <div
                    class="stats__virtual"
                    :class="{ 'stats__virtual--active': data }"
                >
                    {{ data ? 'Yes' : 'No' }}
                </div>
            </template>
            <template #data-actions="{ item }">
                <!-- TODO -->
                <common-button
                    class="stats__action"
                    size="S"
                    target="_blank"
                    :to="`/?airline=${ item.icao }`"
                    type="secondary"
                >
                    Filter by
                </common-button>
            </template>
        </common-table>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import type { TableSort } from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { RadarDataAirline } from '~/utils/backend/storage';
import CommonButton from '~/components/common/basic/CommonButton.vue';

const dataStore = useDataStore();

type Airline = RadarDataAirline & { count: number };

const sort = ref<TableSort[]>([]);

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
