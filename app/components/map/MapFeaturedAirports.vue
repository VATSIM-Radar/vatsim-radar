<template>
    <div class="__info-sections featured-airports">
        <ui-tabs
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
            <navigation-featured-airport
                v-for="(airport, index) in (featuredTab === 'popular' ? popularAirports : quietAirports)"
                :key="airport.icao + index"
                :airport="airport"
                :position="index + 1"
            />
        </div>

        <div class="featured-airports_footer">
            <ui-setting-item :item="getSettingByItem(settingsItems.preferences.showTotalDeparturesInFeaturedAirports, { title: 'Total departures', description: '' })"/>
            <!-- @vue-ignore -->
            <ui-setting-item :item="{ type: 'toggle', title: 'Visible only', value: featuredVisibleOnly, onChange: (val) => store.featuredVisibleOnly = !!val }"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import NavigationFeaturedAirport from '~/components/features/navigation/NavigationFeaturedAirport.vue';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import { useStore } from '~/store';
import distance from '@turf/distance';
import { getSettingsItems } from '~/composables/settings/v2/sections';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';
import type { SettingValueType } from '~/composables/settings/v2/utils';

const featuredTab = ref('popular');
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const settingsItems = getSettingsItems().value;
const featuredVisibleOnly: SettingValueType<boolean> = computed(() => ({
    value: store.featuredVisibleOnly,
    isSet: false,
}));

const popularAirports = computed(() => {
    return dataStore.vatsim.parsedAirportsList.value.filter(x => x.airport && x.aircraftCount && (!store.featuredVisibleOnly || x.visible)).slice().sort((a, b) => b.aircraftCount - a.aircraftCount).slice(0, store.featuredVisibleOnly ? 10 : 25);
});

const quietAirports = computed(() => {
    const facilities = useFacilitiesIds();

    return dataStore.vatsim.parsedAirportsList.value
        .filter(x => x.airport && (!x.airport.isPseudo || x.aircraftCount) && (!store.featuredVisibleOnly || x.visible) && (x.aircraftCount || x.atc.some(x => x.isATIS)) && x.atc.filter(x => x.facility !== facilities.FSS && x.facility !== facilities.CTR).length)
        .slice()
        .sort((a, b) => {
            const aArrivals = (a.aircraft.arrivals ?? []).map(x => dataStore.vatsim.data.keyedPilots.value[x.toString()]).filter(x => x?.toGoDist && x.toGoDist < 200);
            const bArrivals = (b.aircraft.arrivals ?? []).map(x => dataStore.vatsim.data.keyedPilots.value[x.toString()]).filter(x => x?.toGoDist && x.toGoDist < 200);

            const aSum = aArrivals.length + (a.aircraft.groundDep?.length ?? 0);
            const bSum = bArrivals.length + (b.aircraft.groundDep?.length ?? 0);

            const diff = aSum - bSum;

            if (diff === 0 && a.airport && b.airport) {
                const aCoord = [a.airport.lon, a.airport.lat];
                const bCoord = [b.airport.lon, b.airport.lat];

                return distance(mapStore.center, aCoord) - distance(mapStore.center, bCoord);
            }

            return diff;
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

        background: $darkGray800;

        @include pc {
            &::before {
                content: '';

                position: absolute;
                left: calc(50% - 6px);

                display: block;
                align-self: center;

                width: 1px;
                height: 24px;

                background: varToRgba('lightGray500', 0.15);
            }
        }

        >* {
            width: 100%;
        }
    }
}
</style>

