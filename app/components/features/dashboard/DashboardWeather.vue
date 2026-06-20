<template>
    <div class="dashboard-weather">
        <div class="dashboard-weather_strip">
            <div
                v-for="entry in entries"
                :key="entry.icao"
                class="dashboard-weather_card"
                :class="{
                    'dashboard-weather_card--changed': changedWeather[entry.icao] && changedWeather[entry.icao]?.qnh !== entry.qnh,
                    'dashboard-weather_card--active': expandedMetars.has(entry.icao),
                }"
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
                <code
                    v-if="expandedMetars.has(entry.icao)"
                    class="dashboard-weather_card_metar"
                    :class="{ 'dashboard-weather_card_metar--empty': !entry.metar }"
                >{{ entry.metar ?? 'No METAR' }}</code>
                <div
                    v-else
                    class="dashboard-weather_card_meta"
                >
                    <span
                        class="dashboard-weather_card_qnh"
                        :class="{ 'dashboard-weather_card_qnh--empty': !entry.qnh }"
                    >
                        {{ entry.qnh ?? 'No METAR' }}
                    </span>
                    <span
                        v-if="entry.wind"
                        class="dashboard-weather_card_wind"
                    >
                        {{ entry.wind }}
                    </span>
                </div>
            </div>
            <div
                v-if="canEdit"
                class="dashboard-weather_add"
                @click="$emit('addAirport')"
            >
                <span class="dashboard-weather_add_label">Add airport</span>
                <plus-icon class="dashboard-weather_add_icon"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import { parseMetar, AltimeterUnit } from 'metar-taf-parser';
import type { StoreOverlayAirport } from '~/store/map';
import { useDashboard } from '~/composables/dashboard';
import PlusIcon from '@/assets/icons/kit/plus.svg?component';

defineProps({
    canEdit: {
        type: Boolean,
        default: false,
    },
});

defineEmits<{ addAirport: [] }>();

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard, sortByPriorityAirports, getAirportAircraftColor } = useDashboard();
const dataStore = useDataStore();

function getAtisLetter(icao: string): string | null {
    const atisList = dataStore.vatsim.data.atis.value.filter(atis => atis.atis_code && atis.callsign.startsWith(`${ icao }_`) && atis.callsign.endsWith('ATIS'));
    if (!atisList.length) return null;

    const departure = atisList.find(atis => atis.callsign.endsWith('_D_ATIS'))?.atis_code;
    const arrival = atisList.find(atis => atis.callsign.endsWith('_A_ATIS'))?.atis_code;
    const combined = atisList.find(atis => !atis.callsign.endsWith('_D_ATIS') && !atis.callsign.endsWith('_A_ATIS'))?.atis_code;

    if (combined) return combined;
    const parts: string[] = [];
    if (departure) parts.push(`D:${ departure }`);
    if (arrival) parts.push(`A:${ arrival }`);
    return parts.length ? parts.join(' / ') : null;
}

const expandedMetars = ref<Set<string>>(new Set());
const showPreviousMetar = ref(false);

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
            metar,
            qnh: metar ? parseQnh(metar) : null,
            wind: metar ? parseWind(metar) : null,
            atis: getAtisLetter(airport.icao),
        };
    });
});

const QNH_STORAGE_KEY = 'vatsim-radar-dashboard-qnh';
const storedQnh = useCookie<Record<string, { metar: string | null; qnh: string }>>(QNH_STORAGE_KEY, {
    secure: true,
    sameSite: 'none',
    path: '/',
    default: () => ({}),
});
const changedWeather = ref<Record<string, { metar: string | null; qnh: string }>>({});

function acknowledgeQnh(icao: string) {
    if (!changedWeather.value[icao]) return false;
    delete changedWeather.value[icao];
    return true;
}

function onCardClick(icao: string) {
    if (acknowledgeQnh(icao)) return;
    const next = new Set(expandedMetars.value);
    if (next.has(icao)) next.delete(icao);
    else next.add(icao);
    expandedMetars.value = next;
}

onMounted(() => {
    watch(entries, list => {
        for (const entry of list) {
            if (!entry.qnh) continue;
            const previous = storedQnh.value[entry.icao];
            if (previous && (previous.qnh !== entry.qnh || previous.metar !== entry.metar)) {
                changedWeather.value[entry.icao] = {
                    qnh: previous.qnh,
                    metar: previous.metar,
                };
            }
            storedQnh.value[entry.icao] = {
                qnh: entry.qnh,
                metar: entry.metar,
            };
        }
    }, { immediate: true, deep: true });
});
</script>

<style scoped lang="scss">
.dashboard-weather {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_strip {
        overflow-x: auto;
        display: flex;
        gap: 8px;
        padding-bottom: 2px;
    }

    &_card {
        cursor: pointer;

        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 4px;

        min-width: 160px;
        padding: 6px 10px;
        border: 1px solid $darkGray800;
        border-radius: 8px;

        background: $darkGray900;

        transition: 0.3s;

        @include hover {
            &:hover {
                border-color: $blue500;
            }
        }

        &--changed {
            border-color: $citrus500;
            background: varToRgba('warning500', 0.12);
        }

        &--active {
            border-color: $blue500;
        }

        &_head {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        &_color {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        &_icao {
            font-size: 14px;
            font-weight: 700;
            color: $lightGray200;
        }

        &_atis {
            margin-left: auto;
            padding: 1px 6px;
            border-radius: 4px;

            font-size: 11px;
            font-weight: 700;
            color: $blue500;

            background: varToRgba('primary500', 0.15);
        }

        /* The QNH/wind row and the METAR row share the same min-height so toggling between them never
        changes the card height (min-height, so nothing is clipped if content is ever taller) */
        &_meta {
            display: flex;
            gap: 4px 8px;
            align-items: center;
            min-height: 26px;
        }

        &_qnh {
            font-size: 13px;
            font-weight: 600;
            color: $lightGray200;

            &--empty {
                font-weight: 400;
                color: $lightGray500;
            }
        }

        &_wind {
            font-size: 12px;
            color: $lightGray500;
        }

        &_metar {
            display: flex;
            align-items: center;

            min-height: 26px;
            padding: 0 8px;
            border-radius: 4px;

            font-family: $robotoFont;
            font-size: 12px;
            font-weight: 500;
            line-height: 1.4;
            color: $lightGray100;
            letter-spacing: 0.4px;
            white-space: nowrap;

            background: $darkGray600;

            &--empty {
                font-weight: 400;
                color: $lightGray500;
                letter-spacing: normal;
                background: transparent;
            }
        }
    }

    &_add {
        cursor: pointer;

        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        justify-content: center;

        min-width: 160px;
        padding: 6px 10px;
        border: 1px dashed $blue500;
        border-radius: 8px;

        color: $blue500;

        transition: 0.3s;

        @include hover {
            &:hover {
                background: varToRgba('primary500', 0.08);
            }
        }

        &_icon {
            width: 18px;
            min-width: 18px;
        }

        &_label {
            font-size: 12px;
            font-weight: 600;
        }
    }
}
</style>
