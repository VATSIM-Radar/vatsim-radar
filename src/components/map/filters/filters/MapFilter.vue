<template>
    <div class="filter __info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{
                filter: {
                    title: 'Filter',
                },
                manage: {
                    title: 'Manage',
                },
            }"
        />

        <template v-if="tab === 'filter'">
            <common-notification
                cookie-name="filters-input"
                type="info"
            >
                Press enter in search field to add your value to list
            </common-notification>
            <common-block-title
                v-model:collapsed="collapsedStates.users"
                remove-margin
            >
                Users
            </common-block-title>
            <template v-if="!collapsedStates.users">
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            :model-value="store.filter.users?.pilots?.value ?? []"
                            show-chip-value
                            :suggestions="pilotSuggestions"
                            @update:modelValue="setUserFilters({ users: { pilots: { value: $event as string[] } } })"
                        >
                            Pilots Callsigns
                        </map-filter-box>

                        <div class="__grid-info-sections __grid-info-sections--vertical">
                            <div class="__grid-info-sections_title">
                                Strategy (Pilots)
                            </div>
                            <common-radio-group
                                :items="[{ value: 'prefix', text: 'Start with' }, { value: 'include', text: 'Include' }]"
                                :model-value="store.filter.users?.pilots?.type ?? 'prefix'"
                                two-cols
                                @update:modelValue="setUserFilters({ users: { pilots: { type: $event as any } } })"
                            />
                        </div>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.users?.atc?.value ?? []"
                            @update:modelValue="setUserFilters({ users: { atc: { value: $event as string[] } } })"
                        >
                            ATC Callsigns
                        </map-filter-box>

                        <div class="__grid-info-sections __grid-info-sections--vertical">
                            <div class="__grid-info-sections_title">
                                Strategy (ATC)
                            </div>
                            <common-radio-group
                                :items="[{ value: 'prefix', text: 'Start with' }, { value: 'include', text: 'Include' }]"
                                :model-value="store.filter.users?.atc?.type ?? 'prefix'"
                                two-cols
                                @update:modelValue="setUserFilters({ users: { atc: { type: $event as any } } })"
                            />
                        </div>
                    </template>
                </map-filter-columns>

                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            is-number
                            :model-value="store.filter.users?.cids ?? []"
                            @update:modelValue="setUserFilters({ users: { cids: $event as number[] } })"
                        >
                            CIDs
                        </map-filter-box>
                    </template>
                    <template
                        v-if="store.lists.some(x => x.users.length)"
                        #col2
                    >
                        <map-filter-box
                            is-number
                            :model-value="store.filter.users?.lists ?? []"
                            strict
                            :suggestions="store.lists.map(x => ({ value: x.id, text: x.name }))"
                            @update:modelValue="setUserFilters({ users: { lists: $event as number[] } })"
                        >
                            Favorite Lists
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <common-radio-group
                    :items="[{ value: 'and', text: 'Match callsigns AND cids/lists' }, { value: 'or', text: 'Match callsigns OR cids/lists' }]"
                    :model-value="store.filter.users?.strategy ?? 'or'"
                    @update:modelValue="setUserFilters({ users: { strategy: $event as any } })"
                />
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import MapFilterBox from '~/components/map/filters/filters/MapFilterBox.vue';
import { useStore } from '~/store';
import { setUserFilters } from '~/composables/fetchers/filters';
import type { SelectItem } from '~/types/components/select';
import type { RadarDataAirline } from '~/utils/backend/storage';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';
import MapFilterColumns from '~/components/map/filters/filters/MapFilterColumns.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';

const store = useStore();
const tab = ref('filter');

const collapsedStates = reactive({
    users: false,
    airports: false,
    atc: false,
    flights: false,
});

const dataStore = useDataStore();

const pilotSuggestions = computed<SelectItem[]>(() => {
    const airlines: Record<string, { airline: RadarDataAirline; count: number }> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const airline = getAirlineFromCallsign(pilot.callsign);
        if (!airline) continue;
        if (airlines[airline.icao]) airlines[airline.icao].count++;
        else {
            airlines[airline.icao] = {
                airline,
                count: 1,
            };
        }
    }

    return Object.entries(airlines).sort((a, b) => b[1].count - a[1].count).map(x => ({
        value: x[1].airline.icao,
        text: x[1].airline.name,
    }));
});
</script>

<style scoped lang="scss">
.filter {

}
</style>
