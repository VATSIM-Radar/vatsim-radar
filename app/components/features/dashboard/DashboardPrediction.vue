<template>
    <div class="dashboard-prediction">
        <div
            class="dashboard-prediction_head"
            @click="collapsed = !collapsed"
        >
            <arrow-top-icon
                class="dashboard-prediction_head_chevron"
                :class="{ 'dashboard-prediction_head_chevron--collapsed': collapsed }"
            />
            <span class="dashboard-prediction_head_title">Traffic Prediction</span>
        </div>

        <airport-predicted-traffic
            v-if="!collapsed"
            :aircraft="combinedAircraft"
            :predicted-options="activeDashboard?.predictedWindow"
        />
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import AirportPredictedTraffic from '~/components/features/vatsim/airport/AirportPredictedTraffic.vue';
import { getAircraftForAirport } from '~/composables/vatsim/airport';
import type { AirportPopupPilotList } from '~/composables/vatsim/airport';
import { useDashboard } from '~/composables/dashboard';
import type { StoreOverlayAirport } from '~/store/map';
import ArrowTopIcon from '@/assets/icons/kit/arrow-top.svg?component';

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard } = useDashboard();
const airportList = computed(() => (activeDashboard.value?.airports ?? []).filter(x => x.showInTrafficPrediction).map(airport => airport.icao));
const aircraftRefs = shallowRef<Record<string, Ref<AirportPopupPilotList | null>>>({});

const scope = getCurrentScope();

watch(airportList, () => {
    aircraftRefs.value = {};

    try {
        scope?.run(() => {
            for (const icao of airportList.value) {
                aircraftRefs.value[icao] = getAircraftForAirport(computed(() => airportsData.value[icao] ?? { icao }));
            }
        });
    }
    catch (e) {
        console.error(e);
    }

    triggerRef(aircraftRefs);
}, {
    immediate: true,
});

const combinedAircraft = computed<AirportPopupPilotList>(() => {
    const out: AirportPopupPilotList = { groundDep: [], groundArr: [], prefiles: [], departures: [], arrivals: [] };
    for (const icao of airportList.value) {
        const list = aircraftRefs.value[icao]?.value;
        if (!list) continue;
        out.groundDep.push(...list.groundDep);
        out.groundArr.push(...list.groundArr);
        out.prefiles.push(...list.prefiles);
        out.departures.push(...list.departures);
        out.arrivals.push(...list.arrivals);
    }
    return out;
});

const collapsed = useCookie<boolean>('dashboard-prediction-collapsed', {
    sameSite: 'none',
    secure: true,
    path: '/',
    watch: false,
    default: () => false,
});
</script>

<style scoped lang="scss">
.dashboard-prediction {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &_head {
        cursor: pointer;
        display: flex;
        gap: 8px;
        align-items: center;

        &_chevron {
            transform: rotate(0deg);
            width: 12px;
            min-width: 12px;
            transition: 0.3s;

            &--collapsed {
                transform: rotate(180deg);
            }
        }

        &_title {
            font-size: 14px;
            font-weight: 700;
            color: $lightGray200;
        }
    }
}
</style>
