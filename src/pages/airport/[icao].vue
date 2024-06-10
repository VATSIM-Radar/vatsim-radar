<template>
    <div
        v-if="airportData"
        class="airport"
    >
        <div class="airport_sections">
            <div
                v-if="airportData?.airport?.vatInfo || airportData?.airport?.metar"
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
                v-if="airportData?.airport?.taf || airportData.notams?.length"
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
                v-if="atc.length || !ready"
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
                    <airport-controllers v-if="ready"/>
                </div>
            </div>
            <div
                v-if="!ready || (aircraft && Object.values(aircraft).some(x => x.length))"
                class="airport_column airport_column--aircraft"
            >
                <div class="airport_column_data">
                    <div class="airport_column__title">
                        Aircraft
                    </div>
                    <airport-aircraft
                        v-if="ready"
                        filter-relative-to-aircraft
                    />
                </div>
            </div>
        </div>
        <div
            :key="store.theme"
            class="airport_map"
        >
            <iframe :src="`/?preset=dashboard&airport=${ icao }`"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
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
import { useStore } from '~/store';

const route = useRoute();
const store = useStore();
const dataStore = useDataStore();
const ready = ref(false);

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

        ready.value = true;
    },
});
</script>

<style scoped lang="scss">
.airport {
    --sections-height: calc(60dvh - #{$defaultPageHeight});
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    gap: 16px;

    margin: 16px;

    &_sections {
        overflow: auto;
        display: flex;
        gap: 16px;
        height: var(--sections-height);
    }

    &_column {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        gap: 16px;

        width: 0;

        &--aircraft {
            flex-grow: 2;
            max-width: max(20%, 280px);
        }

        &_data {
            overflow: auto;
            padding: 16px;
            background: $darkgray900;
            border-radius: 8px;

            :deep(.info-block) {
                background: $darkgray875 !important;
            }

            :deep(.title_text_content), :deep(.aircraft_list__filter){
                background: $darkgray900 !important;
            }

            :deep(.aircraft_nav) {
                top: 30px !important;
            }

            :deep(.popup-block), :deep(.aircraft_list), :deep(.atc-popup_list) {
                overflow: unset !important;
                max-height: unset !important;
                padding: 0 !important;
                background: transparent !important;
            }

            :deep(.atc-popup-container) {
                width: 100% !important;
                max-width: 100% !important;
            }

            &:not(:only-child) {
                height: calc(var(--sections-height) / 2 - 8px);
            }

            &:only-child {
                flex: 1 0 auto;
                max-height: var(--sections-height);
            }

            :deep(.aircraft_nav_item:not(.aircraft_nav_item--active)) {
                background: $darkgray875 !important;
            }
        }

        &__title {
            position: sticky;
            z-index: 3;
            top: -16px;

            display: flex;
            align-items: center;
            justify-content: space-between;

            width: calc(100% + 16px);
            margin-bottom: 16px;
            margin-left: -16px;
            padding: 4px 0 4px 16px;

            font-family: $openSansFont;
            font-size: 17px;
            font-weight: 700;
            color: $lightgray150;

            background: $darkgray900;
        }
    }

    &_map {
        overflow: hidden;
        height: calc(40dvh - 16px);
        border-radius: 8px;

        iframe {
            all: unset;
            width: 100%;
            height: 100%;
        }
    }
}
</style>
