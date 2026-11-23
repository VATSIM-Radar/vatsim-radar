<template>
    <div class="dashboard-awos">
        <div class="dashboard-awos_head">
            <div
                class="dashboard-awos_head_toggle"
                @click="collapsed = !collapsed"
            >
                <arrow-top-icon
                    class="dashboard-awos_head_chevron"
                    :class="{ 'dashboard-awos_head_chevron--collapsed': collapsed }"
                />
                <span class="dashboard-awos_head_title">AWOS</span>
                <ui-text
                    v-if="icao"
                    color="lightGray500"
                    type="caption"
                >
                    {{ icao }}
                </ui-text>
            </div>
            <ui-select
                v-model="selectedAirport"
                class="dashboard-awos__airport-select"
                :class="{ 'dashboard-awos__airport-select--hidden': collapsed || airportItems.length <= 1 }"
                :items="airportItems"
                width="120px"
            />
        </div>

        <airport-awos
            v-if="!collapsed && icao"
            :icao="icao"
            :metar="metar"
        />
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import type { StoreOverlayAirport } from '~/store/map';
import { useDashboard } from '~/composables/dashboard';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiText from '~/components/ui/text/UiText.vue';
import AirportAwos from '~/components/features/vatsim/airport/AirportAwos.vue';
import ArrowTopIcon from '@/assets/icons/kit/arrow-top.svg?component';

/*
 * Dashboard section around AirportAwos: collapsed by default, and lets the viewer pick which dashboard airport to show
 */

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard, sortByPriorityAirports } = useDashboard();

const collapsed = useLocalStorage('dashboard-awos-collapsed', true);

const airportIcaos = computed(() => sortByPriorityAirports(activeDashboard.value?.airports ?? [], airport => airport.icao).map(airport => airport.icao));
const airportItems = computed<SelectItem<string>[]>(() => airportIcaos.value.map(icao => ({ value: icao, text: icao })));

const selectedAirport = ref<string | null>(null);
// Keep the selection valid when the dashboard airports change (first airport by default)
watch(airportIcaos, icaos => {
    if (!selectedAirport.value || !icaos.includes(selectedAirport.value)) selectedAirport.value = icaos[0] ?? null;
}, { immediate: true });

const icao = computed(() => selectedAirport.value);
const metar = computed(() => (icao.value ? airportsData.value[icao.value]?.airport?.metar ?? null : null));
</script>

<style scoped lang="scss">
.dashboard-awos {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &__airport-select {
        &--hidden {
            visibility: hidden;
            opacity: 0;
        }
    }

    &_head {
        user-select: none;

        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        &_toggle {
            cursor: pointer;
            display: flex;
            gap: 8px;
            align-items: center;
        }

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
