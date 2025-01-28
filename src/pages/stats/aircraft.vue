<template>
    <common-page-block container>
        <template #title>
            Aircraft
        </template>

        <view-stats-tabs/>

        <common-table
            v-model:sort="sort"
            :data="pilotSuggestions"
            :headers="[
                { key: 'place', name: 'Place', width: 40 },
                { key: 'aircraft', name: 'Aircraft', width: 100, sort: true },
                { key: 'count', name: 'Pilots', sort: true },
                { key: 'actions', name: 'Actions', width: 80 },
            ]"
            item-key="cid"
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
            <template #data-actions="{ item }">
                <a
                    class="__link"
                    :href="`/?aircraft=${ item.aircraft }`"
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

type Aircraft = { aircraft: string; count: number };

const sort = ref<TableSort[]>([]);

const pilotSuggestions = computed<Aircraft[]>(() => {
    const list: Record<string, Aircraft> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const aircraft = pilot.aircraft_short?.split('/')[0];

        if (aircraft) {
            if (list[aircraft]) list[aircraft].count++;
            else {
                list[aircraft] = {
                    aircraft,
                    count: 1,
                };
            }
        }
    }

    return Object.values(list).sort((a, b) => b.count - a.count);
});
</script>
