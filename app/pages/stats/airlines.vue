<template>
    <ui-page-container container>
        <template #title>
            Airlines
        </template>

        <stats-tabs/>

        <stats-table
            :loading="loading"
            @range="load"
        >
            <ui-table
                v-model:sort="sort"
                :data="data ?? pilotSuggestions"
                :headers="[
                    { key: 'place', name: 'Place', width: 40 },
                    { key: 'icao', name: 'ICAO', width: 60, sort: true },
                    { key: 'count', name: 'Pilots', width: 60,  sort: true },
                    { key: 'callsign', name: 'Callsign', sort: true },
                    { key: 'name', name: 'Name', sort: true },
                    { key: 'virtual', name: 'Virtual', width: 70, sort: true },
                    ...(!data ? [{ key: 'actions', name: 'Actions', width: 80 }] : []),
                ]"
                item-key="icao"
                multiple-sort
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
                    <a
                        class="__link"
                        :href="`/?airline=${ item.icao }`"
                        target="_blank"
                        @click.stop
                    >
                        Filter By
                    </a>
                </template>
            </ui-table>
        </stats-table>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiTable from '~/components/ui/data/UiTable.vue';
import type { TableSort } from '~/components/ui/data/UiTable.vue';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import type { RadarDataAirline } from '~/utils/server/storage';
import StatsTabs from '~/components/views/StatsTabs.vue';
import StatsTable from '~/components/views/StatsTable.vue';

const dataStore = useDataStore();

type Airline = RadarDataAirline & { count: number };

const sort = ref<TableSort[]>([]);

const pilotSuggestions = shallowRef<Airline[]>([]);
const { data, loading, load } = useHistoricalStats<Airline>('airlines');
let requestId = 0;

const setPilotSuggestions = async () => {
    const currentRequest = ++requestId;
    const airlines: Record<string, Airline> = {};

    const callsigns = new Map<string, number>();
    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const prefix = /^[A-Z]+/.exec(pilot.callsign)?.[0];
        if (prefix) callsigns.set(prefix, (callsigns.get(prefix) ?? 0) + 1);
    }

    await Promise.all([...callsigns].map(async ([callsign, count]) => {
        const airline = await getAirlineFromCallsign(callsign);
        if (airline) {
            if (airlines[airline.icao]) airlines[airline.icao].count += count;
            else {
                airlines[airline.icao] = {
                    ...airline,
                    count,
                };
            }
        }
    }));

    if (currentRequest === requestId) pilotSuggestions.value = Object.values(airlines).sort((a, b) => b.count - a.count);
};

watch(dataStore.vatsim.data.pilots, () => {
    void setPilotSuggestions();
}, {
    immediate: true,
});
</script>
