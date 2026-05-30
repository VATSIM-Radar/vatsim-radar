<template>
    <div class="dashboard-weather">
        <template v-if="expanded && expandedData">
            <div class="dashboard-weather_detail">
                <div class="dashboard-weather_detail_head">
                    <ui-button
                        size="S"
                        type="link"
                        @click="expanded = null"
                    >
                        <template #icon>
                            <arrow-top-icon class="dashboard-weather_detail_head_back"/>
                        </template>
                        {{ expanded }}
                    </ui-button>

                    <div class="dashboard-weather_detail_head_tabs">
                        <div
                            v-for="tab in detailTabs"
                            :key="tab.key"
                            class="dashboard-weather_chip"
                            :class="{ 'dashboard-weather_chip--active': detailTab === tab.key }"
                            @click="detailTab = tab.key"
                        >
                            {{ tab.title }}
                        </div>
                    </div>
                </div>

                <dashboard-airport-provider :data="expandedData">
                    <template v-if="detailTab === 'metar'">
                        <airport-metar v-if="expandedData.airport?.metar"/>
                        <div
                            v-else
                            class="dashboard-weather_detail_empty"
                        >
                            No METAR available.
                        </div>
                    </template>
                    <template v-else-if="detailTab === 'taf'">
                        <airport-taf v-if="expandedData.airport?.taf"/>
                        <div
                            v-else
                            class="dashboard-weather_detail_empty"
                        >
                            No TAF available.
                        </div>
                    </template>
                    <template v-else-if="detailTab === 'notams'">
                        <airport-notams v-if="expandedData.notams?.length"/>
                        <div
                            v-else
                            class="dashboard-weather_detail_empty"
                        >
                            No NOTAMs available.
                        </div>
                    </template>
                    <ui-copy-info
                        v-else-if="detailTab === 'prev' && previousMetar[expanded]"
                        auto-expand
                        :text="previousMetar[expanded]"
                    />
                </dashboard-airport-provider>
            </div>
        </template>
        <template v-else>
            <div class="dashboard-weather_strip">
                <div
                    v-for="entry in entries"
                    :key="entry.icao"
                    class="dashboard-weather_card"
                    :class="{ 'dashboard-weather_card--changed': changedQnh.has(entry.icao) }"
                    @click="onCardClick(entry.icao)"
                >
                    <div class="dashboard-weather_card_head">
                        <span
                            v-if="getAirportAircraftColor(entry.icao)"
                            class="dashboard-weather_card_color"
                            :style="{ background: getAirportAircraftColor(entry.icao) ?? undefined }"
                        />
                        <span class="dashboard-weather_card_icao">{{ entry.icao }}</span>
                        <span
                            v-if="entry.atis"
                            class="dashboard-weather_card_atis"
                            title="Current ATIS information letter"
                        >
                            {{ entry.atis }}
                        </span>
                    </div>

                    <div
                        v-if="entry.qnh"
                        class="dashboard-weather_card_qnh"
                    >
                        {{ entry.qnh }}
                    </div>
                    <div
                        v-else
                        class="dashboard-weather_card_qnh dashboard-weather_card_qnh--empty"
                    >
                        No METAR
                    </div>

                    <div
                        v-if="entry.wind"
                        class="dashboard-weather_card_wind"
                    >
                        {{ entry.wind }}
                    </div>

                    <div class="dashboard-weather_card_actions">
                        <div
                            class="dashboard-weather_chip"
                            @click.stop="openDetail(entry.icao, 'taf')"
                        >
                            TAF
                        </div>
                        <div
                            class="dashboard-weather_chip"
                            @click.stop="openDetail(entry.icao, 'notams')"
                        >
                            NOTAM
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import { parseMetar, AltimeterUnit } from 'metar-taf-parser';
import type { StoreOverlayAirport } from '~/store/map';
import { useDashboard } from '~/composables/dashboard';
import DashboardAirportProvider from '~/components/features/dashboard/DashboardAirportProvider.vue';
import AirportMetar from '~/components/features/vatsim/airport/AirportMetar.vue';
import AirportTaf from '~/components/features/vatsim/airport/AirportTaf.vue';
import AirportNotams from '~/components/features/vatsim/airport/AirportNotams.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import ArrowTopIcon from '@/assets/icons/kit/arrow-top.svg?component';

type DetailTab = 'metar' | 'taf' | 'notams' | 'prev';

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard, sortByPriorityAirports, getAirportAircraftColor } = useDashboard();
const dataStore = useDataStore();

function getAtisLetter(icao: string): string | null {
    const atisList = dataStore.vatsim.data.atis.value.filter(atis => atis.atis_code && atis.callsign.startsWith(`${ icao }_`) && atis.callsign.endsWith('ATIS'));
    if (!atisList.length) return null;

    const departure = atisList.find(atis => atis.callsign.endsWith('D_ATIS'))?.atis_code;
    const arrival = atisList.find(atis => atis.callsign.endsWith('A_ATIS'))?.atis_code;
    const combined = atisList.find(atis => !atis.callsign.endsWith('D_ATIS') && !atis.callsign.endsWith('A_ATIS'))?.atis_code;

    if (combined) return combined;
    const parts: string[] = [];
    if (departure) parts.push(`D:${ departure }`);
    if (arrival) parts.push(`A:${ arrival }`);
    return parts.length ? parts.join(' / ') : null;
}

const expanded = ref<string | null>(null);
const detailTab = ref<DetailTab>('metar');
const expandedData = computed(() => (expanded.value ? airportsData.value[expanded.value] ?? null : null));

const detailTabs = computed(() => {
    const tabs: { key: DetailTab; title: string }[] = [
        { key: 'metar', title: 'METAR' },
        { key: 'taf', title: 'TAF' },
        { key: 'notams', title: 'NOTAMs' },
    ];
    if (expanded.value && previousMetar.value[expanded.value]) tabs.push({ key: 'prev', title: 'Previous' });
    return tabs;
});

function parseQnh(metar: string): string | null {
    try {
        const parsed = parseMetar(metar, { issued: new Date() });
        if (!parsed.altimeter) return null;
        return `${ parsed.altimeter.value } ${ parsed.altimeter.unit === AltimeterUnit.HPa ? 'hPa' : 'inHG' }`;
    }
    catch {
        return null;
    }
}

function parseWind(metar: string): string | null {
    try {
        const parsed = parseMetar(metar, { issued: new Date() });
        if (!parsed.wind) return null;
        const dir = typeof parsed.wind.degrees === 'number' ? `${ parsed.wind.degrees }°` : parsed.wind.direction;
        return `${ dir } ${ parsed.wind.speed } ${ parsed.wind.unit || 'MPS' }`;
    }
    catch {
        return null;
    }
}

const entries = computed(() => {
    const airports = sortByPriorityAirports(activeDashboard.value?.airports ?? [], airport => airport.icao);
    return airports.map(airport => {
        const metar = airportsData.value[airport.icao]?.airport?.metar ?? null;
        return {
            icao: airport.icao,
            qnh: metar ? parseQnh(metar) : null,
            wind: metar ? parseWind(metar) : null,
            atis: getAtisLetter(airport.icao),
        };
    });
});

const QNH_STORAGE_KEY = 'vatsim-radar-dashboard-qnh';
const storedQnh = ref<Record<string, string>>({});
const changedQnh = ref<Set<string>>(new Set());
const previousMetar = ref<Record<string, string>>({});
const lastMetar: Record<string, string> = {};

function persistQnh() {
    try {
        localStorage.setItem(QNH_STORAGE_KEY, JSON.stringify(storedQnh.value));
    }
    catch {
        // bro...
    }
}

function acknowledgeQnh(icao: string) {
    if (!changedQnh.value.has(icao)) return false;
    changedQnh.value.delete(icao);
    changedQnh.value = new Set(changedQnh.value);
    return true;
}

function openDetail(icao: string, tab: DetailTab) {
    acknowledgeQnh(icao);
    expanded.value = icao;
    detailTab.value = tab;
}

function onCardClick(icao: string) {
    if (acknowledgeQnh(icao)) return;
    openDetail(icao, 'metar');
}

onMounted(() => {
    try {
        storedQnh.value = JSON.parse(localStorage.getItem(QNH_STORAGE_KEY) ?? '{}') ?? {};
    }
    catch {
        storedQnh.value = {};
    }

    watch(entries, list => {
        const next = new Set(changedQnh.value);
        for (const entry of list) {
            if (!entry.qnh) continue;
            const previous = storedQnh.value[entry.icao];
            if (previous && previous !== entry.qnh) next.add(entry.icao);
            storedQnh.value[entry.icao] = entry.qnh;
        }
        changedQnh.value = next;
        persistQnh();
    }, { immediate: true, deep: true });

    watch(() => Object.fromEntries(Object.entries(airportsData.value).map(([icao, data]) => [icao, data?.airport?.metar ?? ''])), texts => {
        for (const [icao, text] of Object.entries(texts)) {
            if (!text) continue;
            if (lastMetar[icao] && lastMetar[icao] !== text) previousMetar.value[icao] = lastMetar[icao];
            lastMetar[icao] = text;
        }
    }, { immediate: true, deep: true });
});
</script>

<style scoped lang="scss">
.dashboard-weather {
    &_strip {
        overflow-x: auto;
        display: flex;
        gap: 8px;
        padding-bottom: 4px;
    }

    &_card {
        cursor: pointer;

        display: flex;
        flex-direction: column;
        gap: 6px;

        min-width: 150px;
        padding: 10px 12px;
        border: 1px solid $darkGray800;
        border-radius: 8px;

        background: $darkGray900;

        transition: 0.3s;

        @include hover {
            &:hover {
                border-color: $primary500;
            }
        }

        &--changed {
            border-color: $warning500;
            background: varToRgba('warning500', 0.12);
        }

        &_head {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        &_color {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        &_icao {
            font-size: 16px;
            font-weight: 700;
            color: $lightGray200;
        }

        &_atis {
            margin-left: auto;
            padding: 1px 6px;
            border-radius: 4px;

            font-size: 12px;
            font-weight: 700;
            color: $primary500;

            background: varToRgba('primary500', 0.15);
        }

        &_qnh {
            font-size: 15px;
            font-weight: 600;
            color: $lightGray200;

            &--empty {
                font-weight: 400;
                color: $lightGray500;
            }
        }

        &_wind {
            font-size: 13px;
            color: $lightGray500;
        }

        &_actions {
            display: flex;
            gap: 6px;
            margin-top: 2px;
        }
    }

    &_chip {
        cursor: pointer;

        padding: 2px 8px;
        border: 1px solid $darkGray700;
        border-radius: 4px;

        font-size: 12px;
        font-weight: 600;
        color: $lightGray200;

        transition: 0.3s;

        @include hover {
            &:hover {
                border-color: $primary500;
                color: $primary500;
            }
        }

        &--active {
            border-color: $primary500;
            color: $primary500;
        }
    }

    &_detail {
        display: flex;
        flex-direction: column;
        gap: 12px;

        &_head {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            justify-content: space-between;

            &_back {
                transform: rotate(-90deg);
            }

            &_tabs {
                display: flex;
                gap: 6px;
            }
        }

        &_empty {
            padding: 8px;
            font-size: 13px;
            color: $lightGray500;
        }
    }
}
</style>
