<template>
    <common-page-block container>
        <template #title>
            Routes
        </template>

        <view-stats-tabs/>

        <common-table
            v-model:sort="sort"
            :data="routes"
            :headers="[
                { key: 'place', name: 'Place', width: 40 },
                { key: 'from', name: 'From', sort: true },
                { key: 'to', name: 'To', sort: true },
                { key: 'count', name: 'Aircraft', width: 80, sort: true },
                { key: 'actions', name: 'Actions', width: 120 },
            ]"
            item-key="key"
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
            <template #data-from="{ data }">
                {{ data }} ({{ dataStore.vatspy.value?.data.keyAirports.realIcao[data]?.name ?? 'Unknown' }})
            </template>
            <template #data-to="{ data }">
                {{ data }} ({{ dataStore.vatspy.value?.data.keyAirports.realIcao[data]?.name ?? 'Unknown' }})
            </template>
            <template #data-actions="{ item }">
                <a
                    class="__link"
                    :href="`/?route=${ item.from }-${ item.to }`"
                    target="_blank"
                    @click.stop
                >
                    Filter By
                </a>
            </template>
        </common-table>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';
import type { TableSort } from '~/components/common/basic/CommonTable.vue';
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import ViewStatsTabs from '~/components/views/ViewStatsTabs.vue';

const dataStore = useDataStore();

const sort = ref<TableSort[]>([]);

interface Route {
    from: string; to: string; count: number; key: string;
}

const routes = computed<Route[]>(() => {
    const routes: Record<string, Route> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        if (!pilot.departure || !pilot.arrival) continue;

        const key = `${ pilot.departure }-${ pilot.arrival }`;

        let route = routes[key];
        if (!route) {
            route = {
                key: key,
                from: pilot.departure,
                to: pilot.arrival,
                count: 0,
            };

            routes[key] = route;
        }

        route.count++;
    }

    return Object.values(routes).sort((a, b) => b.count - a.count);
});
</script>
