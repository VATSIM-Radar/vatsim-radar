<template>
    <div
        v-if="airportData"
        class="airport"
    >
        <div class="airport_sections">
            <div
                v-if="airportData?.airport?.vatInfo && airportData?.airport?.metar"
                class="airport_column"
            >
                <div
                    v-if="airportData?.airport?.vatInfo"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        VATSIM Airport Info
                    </div>
                    <airport-info/>
                </div>
                <div
                    v-if="airportData?.airport?.metar"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        METAR
                    </div>
                    <airport-metar/>
                </div>
            </div>
            <div
                v-if="airportData?.airport?.taf && airportData.notams?.length"
                class="airport_column"
            >
                <div
                    v-if="airportData?.airport?.taf"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        TAF
                    </div>
                    <airport-taf/>
                </div>
                <div
                    v-if="airportData?.notams?.length"
                    class="airport_column_data"
                >
                    <div class="airport_column__title">
                        NOTAMS
                    </div>
                    <airport-notams/>
                </div>
            </div>
            <div
                v-if="atc.length"
                class="airport_column"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        <div class="airport_column__title_text">
                            Active Controllers
                        </div>
                        <common-bubble class="airport_column__title_aside">
                            {{ atc.length }}
                        </common-bubble>
                    </div>
                    <airport-controllers/>
                </div>
            </div>
            <div
                v-if="aircraft && Object.values(aircraft).some(x => x.length)"
                class="airport_column"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        Aircraft
                    </div>
                    <airport-aircraft/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import type { Map } from 'ol';
import AirportInfo from '~/components/views/airport/AirportInfo.vue';
import { getAircraftForAirport, getATCForAirport, provideAirport } from '~/composables/airport';
import type { StoreOverlayAirport } from '~/store/map';
import AirportMetar from '~/components/views/airport/AirportMetar.vue';
import AirportTaf from '~/components/views/airport/AirportTaf.vue';
import AirportNotams from '~/components/views/airport/AirportNotams.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import type { Ref } from 'vue';
import AirportAircraft from '~/components/views/airport/AirportAircraft.vue';
import AirportControllers from '~/components/views/airport/AirportControllers.vue';

const route = useRoute();
const dataStore = useDataStore();
const map = shallowRef<Map | null>(null);
provide('map', map);

const icao = computed(() => (route.params.icao as string)?.toUpperCase());
const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === icao.value));
const airportData = shallowRef<StoreOverlayAirport['data'] | null>(null);
const atc = getATCForAirport(airportData as Ref<StoreOverlayAirport['data']>);
const aircraft = getAircraftForAirport(airportData as Ref<StoreOverlayAirport['data']>);

provideAirport(airportData as Ref<StoreOverlayAirport['data']>);

useHead({
    title: icao,
});

airportData.value = (await useAsyncData(async () => {
    try {
        const data = $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ icao.value }`);
        const notams = $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ icao.value }/notams`).catch(console.error);

        return {
            airport: await data,
            notams: await notams ?? [],
            showTracks: false,
            icao: icao.value,
        };
    }
    catch (e) {
        console.error(e);
        showError({
            statusCode: 404,
        });
    }
})).data.value!;

await setupDataFetch({
    onSuccessCallback() {
        if (!airport.value) {
            showError({
                statusCode: 404,
            });
            return;
        }
    },
});
</script>

<style scoped lang="scss">
.airport {
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;

    &_sections {
        overflow: auto;
        max-height: calc(100dvh - #{$defaultPageHeight});
    }
}
</style>
