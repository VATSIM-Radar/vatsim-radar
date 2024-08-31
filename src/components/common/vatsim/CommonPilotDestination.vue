<template>
    <div
        v-if="pilot.departure && pilot.arrival"
        class="destination"
    >
        <common-info-block
            :bottom-items="[depAirport?.name]"
            class="destination_card"
            :is-button="!!depAirport"
            text-align="center"
            :top-items="[pilot.departure]"
            @click="mapStore.addAirportOverlay(depAirport?.icao ?? '')"
        />
        <div class="destination_aircraft-icon">
            <aircraft-icon/>
        </div>
        <common-info-block
            :bottom-items="[arrAirport?.name]"
            class="destination_card"
            :is-button="!!arrAirport"
            text-align="center"
            :top-items="[pilot.arrival]"
            @click="mapStore.addAirportOverlay(arrAirport?.icao ?? '')"
        />
    </div>
</template>

<script setup lang="ts">
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import AircraftIcon from '@/assets/icons/kit/aircraft.svg?component';
import { useMapStore } from '~/store/map';

const props = defineProps({
    pilot: {
        type: Object as PropType<Partial<VatsimShortenedAircraft> & Pick<VatsimShortenedAircraft, 'arrival' | 'departure'>>,
        required: true,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

const airports = computed(() => dataStore.vatspy.value?.data.airports.filter(x => x.icao === props.pilot.departure || x.icao === props.pilot.arrival) ?? []);

const depAirport = computed(() => airports.value.find(x => x.icao === props.pilot.departure));
const arrAirport = computed(() => airports.value.find(x => x.icao === props.pilot.arrival));
</script>

<style scoped lang="scss">
.destination {
  display: flex;
  justify-content: center;
  gap: 4px;
  position: relative;

  > * {
    flex: 1 1 0;
    width: 0;
  }

  &_aircraft-icon {
    display: flex;
    flex: none;
    gap: 8px;
    align-items: center;
    justify-content: center;
    top: 8px;

    width: auto;
    padding: 0 4px;
    position: absolute;
    z-index: 1;

    &::before, &::after {
      content: '';

      width: 2px;
      height: 2px;

      background: currentColor;
      border-radius: 100%;
    }

    svg {
      width: 16px;
    }
  }
}
</style>
