<template>
    <ui-page-container>
        <template #title>DotWallop personal page</template>

        <ui-checkbox v-model="nonAddedOnly">
            Non-added only
        </ui-checkbox>

        <table v-if="data?.pilots">
            <tbody>
                <tr
                    v-for="item in aircraft"
                    :key="item.aircraft"
                >
                    <td>
                        {{item.aircraft}}
                    </td>
                    <td>
                        {{item.count}}
                    </td>
                    <td>
                        {{item.added ? 'Added' : 'Missing'}}
                    </td>
                </tr>
            </tbody>
        </table>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import type { VatsimLiveData } from '~/types/data/vatsim';
import UiCheckbox from '~/components/ui/inputs/UiCheckbox.vue';

const nonAddedOnly = ref(false);

const { data } = await useAsyncData('mats', async () => {
    return $fetch<VatsimLiveData>('/api/data/vatsim/data');
});

const aircraft = computed(() => {
    const list: Record<string, number> = {};

    for (const pilot of data.value?.pilots || []) {
        if (!pilot.aircraft_short) continue;

        const label = pilot.aircraft_short.split('/')[0];

        if (list[label]) list[label]++;
        else list[label] = 1;
    }

    return Object
        .entries(list)
        .map(([key, value]) => ({
            aircraft: key,
            count: value,
            // @ts-expect-error Dynamic key value
            added: aircraftIcons[key.toLowerCase()],
        }))
        .filter(x => !nonAddedOnly.value || !x.added)
        .sort((a, b) => b.count - a.count);
});
</script>
