<template>
    <div class="__info-sections featured-airports">
        <common-tabs
            v-model="featuredTab"
            mobile-vertical
            :tabs="{
                popular: {
                    title: 'Popular Airports',
                },
                quiet: {
                    title: 'Quiet Airports',
                },
            }"
        />

        <small v-if="featuredTab === 'quiet'">
            Quiet, staffed airports with at least one controller available, excluding center.
        </small>

        <div class="__info-sections featured-airports_list">
            <common-airport-card
                v-for="(airport, index) in (featuredTab === 'popular' ? popularAirports : quietAirports)"
                :key="airport.airport.icao + index"
                :airport="airport"
                :position="index + 1"
            />
        </div>

        <div class="featured-airports_footer">
            <common-toggle
                :model-value="store.localSettings.traffic?.showTotalDeparturesInFeaturedAirports ?? false"
                @update:modelValue="setUserLocalSettings({ traffic: { showTotalDeparturesInFeaturedAirports: $event } })"
            >
                Show total departures
                <template #description>
                    Including airborne
                </template>
            </common-toggle>
            <common-toggle v-model="store.featuredVisibleOnly">
                Visible only
                <template #description>
                    Filter by current map area
                </template>
            </common-toggle>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonAirportCard from '~/components/common/vatsim/CommonAirportCard.vue';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';

const featuredTab = ref('popular');
const store = useStore();
const dataStore = useDataStore();

const popularAirports = computed(() => {
    return dataStore.vatsim.parsedAirports.value.filter(x => !x.airport.isPseudo && x.aircraftCids.length).slice().sort((a, b) => b.aircraftCids.length - a.aircraftCids.length).slice(0, store.featuredVisibleOnly ? 10 : 25);
});

const quietAirports = computed(() => {
    return dataStore.vatsim.parsedAirports.value
        .filter(x => !x.airport.isPseudo && (x.aircraftCids.length || x.localAtc.some(x => x.isATIS)) && (x.arrAtc.length || x.localAtc.some(x => !x.isATIS)))
        .slice()
        .sort((a, b) => {
            const aSum = (a.aircraftList.arrivals?.length ?? 0) + (a.aircraftList.groundDep?.length ?? 0);
            const bSum = (b.aircraftList.arrivals?.length ?? 0) + (b.aircraftList.groundDep?.length ?? 0);

            return aSum - bSum;
        })
        .slice(0, 25);
});
</script>

<style lang="scss" scoped>
div.featured-airports {
    gap: 8px;

    &_list {
        overflow: auto;
        max-height: 240px;
    }

    &_footer {
        position: relative;

        display: flex;
        gap: 24px;
        justify-content: space-between;

        padding: 8px;
        border-radius: 4px;

        background: $darkgray950;

        &::before {
            content: '';

            position: absolute;
            left: calc(50% - 6px);

            display: block;
            align-self: center;

            width: 1px;
            height: 24px;

            background: varToRgba('lightgray150', 0.15);
        }

        >* {
            width: 100%;
        }
    }
}
</style>


