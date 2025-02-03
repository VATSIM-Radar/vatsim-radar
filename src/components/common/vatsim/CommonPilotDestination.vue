<template>
    <div v-if="pilot.departure && pilot.arrival"
    class="destination_wrap">
        <div class="destination">
            <common-info-block
                :bottom-items="[depAirport?.name]"
                class="destination_card"
                :is-button="!!depAirport"
                text-align="center"
                :top-items="[depAirport?.icao]"
                @click="mapStore.addAirportOverlay(depAirport?.icao ?? '')"
            />
            <div class="destination_aircraft-icon">
                <aircraft-icon/>
            </div>
            <div v-if="pilot.diverted" 
            class="diverted_icon">
                <path-icon/>
            </div>
            <common-info-block
                v-if="!pilot.diverted"
                :bottom-items="[arrAirport?.name]"
                class='destination_card'
                :is-button="!!arrAirport"
                text-align="center"
                :top-items="[arrAirport?.icao]"
                @click="mapStore.addAirportOverlay(arrAirport?.icao ?? '')"
            />
            <common-info-block
                v-if="pilot.diverted"
                :bottom-items="[divOrgAirport?.name]"
                class='destination_diverted'
                :is-button="!!divOrgAirport"
                text-align="center"
                :top-items="[divOrgAirport?.icao]"
                @click="mapStore.addAirportOverlay(divOrgAirport?.icao ?? '')"
            />
        </div>
        <common-info-block
            v-if="pilot.diverted"
            :bottom-items="['Diverted to ' + divArrAirport?.name]"
            class="diverted"
            :is-button="!!divArrAirport"
            text-align="center"
            :top-items="[divArrAirport?.icao]"
            @click="mapStore.addAirportOverlay(divArrAirport?.icao ?? '')"
        />
    </div>
</template>

<script setup lang="ts">
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import AircraftIcon from '@/assets/icons/kit/aircraft.svg?component';
import PathIcon from '@/assets/icons/kit/path.svg?component';
import { useMapStore } from '~/store/map';

const props = defineProps({
    pilot: {
        type: Object as PropType<Partial<VatsimShortenedAircraft> & Pick<VatsimShortenedAircraft, 'arrival' | 'departure'>>,
        required: true,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

const airports = computed(() => dataStore.vatspy.value?.data.airports.filter(x => x.icao === props.pilot.departure || x.icao === props.pilot.arrival || x.icao === props.pilot.diverted_arrival || x.icao === props.pilot.diverted_origin) ?? []);

const depAirport = computed(() => airports.value.find(x => x.icao === props.pilot.departure));
const arrAirport = computed(() => airports.value.find(x => x.icao === props.pilot.arrival));
const divArrAirport = computed(() => airports.value.find(x => x.icao === props.pilot.diverted_arrival));
const divOrgAirport = computed(() => airports.value.find(x => x.icao === props.pilot.diverted_origin));
</script>

<style scoped lang="scss">
.destination {
    position: relative;
    display: flex;
    gap: 4px;
    justify-content: center;

    > * {
        flex: 1 1 0;
        width: 0;
    }

    &_aircraft-icon {
        position: absolute;
        z-index: 1;
        top: 8px;

        display: flex;
        flex: none;
        gap: 8px;
        align-items: center;
        justify-content: center;

        width: auto;
        padding: 0 4px;

        &::before, &::after {
            content: '';

            width: 2px;
            height: 2px;
            border-radius: 100%;

            background: currentColor;
        }

        svg {
            width: 16px;
        }
    }

    &_diverted {
        color: $divertedTextColor;
    }

    &_wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
    }
}

.diverted {
    display: flex;
    justify-content: center;
    padding: 4px;
    background: $divertedBackground;

    &_icon {
        position: absolute;
        z-index: 1;
        bottom: -12px;

        display: flex;
        flex: none;
        align-items: center;
        justify-content: center;

        width: auto;
        padding: 0 4px;

        svg {
            width: 24px;
        }
    }
}
</style>
