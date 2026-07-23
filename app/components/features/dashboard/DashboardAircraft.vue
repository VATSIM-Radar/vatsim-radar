<template>
    <div class="dashboard-aircraft">
        <div
            class="dashboard-aircraft_columns"
            :class="{ 'dashboard-aircraft_columns--horizontal': horizontal }"
        >
            <div
                v-for="column in columns"
                :key="column.column"
                class="dashboard-aircraft_col"
                :class="{ 'dashboard-aircraft_col--collapsed': collapsed.has(column.column) }"
                :style="{ '--color': column.color }"
            >
                <div
                    class="dashboard-aircraft_col_head"
                    @click="toggleColumn(column.column)"
                >
                    <arrow-top-icon
                        class="dashboard-aircraft_col_head_chevron"
                        :class="{ 'dashboard-aircraft_col_head_chevron--collapsed': collapsed.has(column.column) }"
                    />
                    <ui-text class="dashboard-aircraft_col_head_title" type="2b-medium">{{ column.label }}</ui-text>
                    <ui-text class="dashboard-aircraft_rate" type="caption">
                        <vatsim-traffic-rate
                            v-if="column.key === 'arrivals'"
                            :aircraft="combinedAircraft"
                            icon-color="rgb(var(--lightGray200))"
                            text-color="rgb(var(--lightGray200))"
                        />
                    </ui-text>
                    <ui-bubble type="secondary">
                        {{ column.count }}
                    </ui-bubble>
                </div>

                <div
                    v-if="!collapsed.has(column.column)"
                    class="dashboard-aircraft_col_body"
                >
                    <template v-if="column.rows.length">
                        <template
                            v-for="row in column.rows"
                            :key="row.key"
                        >
                            <div
                                v-if="row.type === 'header'"
                                class="dashboard-aircraft_group"
                            >
                                <span
                                    v-if="row.color"
                                    class="dashboard-aircraft_group_color"
                                    :style="{ background: row.color }"
                                />
                                {{ row.icao }}
                            </div>

                            <ui-text-block
                                v-else
                                :bottom-items="pilotBottomItems(row.pilot, row.statusKey)"
                                class="dashboard-aircraft_pilot"
                                :class="{
                                    'dashboard-aircraft_pilot--bordered': !!row.color,
                                    'dashboard-aircraft_pilot--selected': selected === row.pilot.cid,
                                }"
                                is-button
                                :style="row.color ? { '--airport-color': row.color } : undefined"
                                @click="selectPilot(row.pilot)"
                            >
                                <template #top>
                                    <div
                                        ref="pilots"
                                        class="dashboard-aircraft_pilot_head"
                                        :data-cid="row.pilot.cid"
                                    >
                                        <span class="dashboard-aircraft_pilot_head_cs">{{ row.pilot.callsign }}</span>
                                        <ui-bubble
                                            v-if="'frequencies' in row.pilot && row.pilot.frequencies.length >= 1"
                                            class="dashboard-aircraft_pilot_head_stats_frequency"
                                            type="primary-flat"
                                        >
                                            {{ row.pilot.frequencies[0] }}
                                        </ui-bubble>
                                        <vatsim-pilot-hours
                                            v-if="stats.find(x => x.cid === row.pilot.cid)"
                                            class="dashboard-aircraft_pilot_head_stats"
                                            :hours="stats.find(x => x.cid === row.pilot.cid)!.stats"
                                        />
                                        <div class="__spacer"/>
                                        <span
                                            class="dashboard-aircraft_pilot_head_status"
                                            :style="{ '--color': `rgb(var(--${ pilotStatus(row.pilot, row.statusKey).color }))` }"
                                        >
                                            {{ pilotStatus(row.pilot, row.statusKey).title }}
                                        </span>
                                    </div>
                                </template>
                                <template #bottom="{ item }">
                                    {{ item }}
                                </template>
                            </ui-text-block>
                        </template>
                    </template>
                    <div
                        v-else
                        class="dashboard-aircraft_empty"
                    >
                        No aircraft
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import VatsimTrafficRate from '~/components/features/vatsim/airport/VatsimTrafficRate.vue';
import { getAircraftForAirport } from '~/composables/vatsim/airport';
import type { AirportPopupPilotList, AirportPopupPilotStatus } from '~/composables/vatsim/airport';
import { getPilotStatus, getTimeRemains } from '~/composables/vatsim/pilots';
import { useDashboard, mapDashboardColumnToAircraftKey } from '~/composables/dashboard';
import type { DashboardAircraftKey } from '~/composables/dashboard';
import { useEnrouteAircraft } from '~/composables/vatsim/enroute';
import { dashboardColumnLabels, dashboardColumns } from '~/utils/shared/dashboard';
import type { DashboardColumn } from '~/utils/shared/dashboard';
import type { StoreOverlayAirport } from '~/store/map';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import ArrowTopIcon from '@/assets/icons/kit/arrow-top.svg?component';
import VatsimPilotHours from '~/components/features/vatsim/pilots/VatsimPilotHours.vue';
import UiText from '~/components/ui/text/UiText.vue';

const selected = defineModel<number | null>('selected', { type: Number, default: null });

const airportsData = inject<Ref<Record<string, StoreOverlayAirport['data']>>>('dashboard-airports-data')!;
const { activeDashboard, sortByPriorityAirports, isColoredAirport, getAirportAircraftColor } = useDashboard();

const route = useRoute();
const router = useRouter();

const airportList = computed(() => (activeDashboard.value?.airports ?? []).map(airport => airport.icao));
const aircraftRefs = shallowRef<Record<string, Ref<AirportPopupPilotList | null>>>({});

const scope = getCurrentScope();

watch(airportList, () => {
    aircraftRefs.value = {};
    try {
        scope?.run(() => {
            for (const icao of airportList.value) {
                aircraftRefs.value[icao] = getAircraftForAirport(computed(() => airportsData.value[icao] ?? { icao }), ref<any>(null));
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

const COLUMN_ORDER: DashboardColumn[] = ['prefiles', 'departing', 'enroute', 'departed', 'arriving', 'landed'];
const GROUPED_KEYS = new Set<DashboardAircraftKey>(['prefiles', 'groundDep', 'groundArr']);

interface DashboardOverrides {
    arrivalTracks: boolean;
    enrouteCallsign: string | null;
    enrouteFlightLevel: { from: number; to: number } | null;
}
const overrides = inject<Ref<DashboardOverrides> | null>('dashboard-overrides', null);

const { enrouteAircraft: enrouteRaw } = useEnrouteAircraft({
    callsign: computed(() => overrides?.value.enrouteCallsign ?? null),
    flFrom: computed(() => overrides?.value.enrouteFlightLevel?.from ?? null),
    flTo: computed(() => overrides?.value.enrouteFlightLevel?.to ?? null),
});

const enrouteAircraft = computed<AirportPopupPilotStatus[]>(() => enrouteRaw.value.map(pilot => ({
    ...pilot,
    isArrival: false,
    distance: 0,
    flown: 0,
    eta: null,
})));

type AircraftRow =
    | { type: 'header'; key: string; icao: string; color: string | null }
    | { type: 'pilot'; key: string; pilot: AirportPopupPilotStatus; statusKey: DashboardAircraftKey; color: string | null };

interface ColumnView {
    column: DashboardColumn;
    key: DashboardAircraftKey;
    label: string;
    count: number;
    rows: AircraftRow[];
    color: string;
}

function groundspeedOf(pilot: AirportPopupPilotStatus): number {
    return (pilot as VatsimShortenedAircraft).groundspeed;
}

function sortGround(list: AirportPopupPilotStatus[]): AirportPopupPilotStatus[] {
    return list.slice().sort((a, b) => groundspeedOf(b) - groundspeedOf(a));
}

function arrivalsComparator(a: AirportPopupPilotStatus, b: AirportPopupPilotStatus): number {
    if (!a.eta && b.eta) return 1;
    if (a.eta && !b.eta) return -1;
    if (!a.eta && !b.eta) {
        const gs = groundspeedOf(b) - groundspeedOf(a);
        if (gs === 0) return a.distance - b.distance;
        return gs;
    }
    return a.eta!.getTime() - b.eta!.getTime();
}

const airportAircraft = computed(() => {
    return new Set(Object.values(aircraftRefs.value).flatMap(x => Object.values(x.value ?? {}).flatMap(x => x.map(x => x.cid))));
});

const stats = ref<{
    cid: number;
    stats: number;
}[]>([]);

const pilots = ref<HTMLDivElement[] | HTMLDivElement>([]);

const pilotsRefs = computed<HTMLDivElement[]>(() => {
    if (Array.isArray(pilots.value)) return pilots.value;
    if (pilots.value) return [pilots.value];
    return [];
});

const observer = new IntersectionObserver(async entries => {
    for (const entry of entries.filter(x => x.isIntersecting && !x.target.classList.contains('--has-stats'))) {
        const cid = +((entry.target as HTMLDivElement).dataset.cid ?? '0');

        stats.value.push({
            cid,
            stats: await getVATSIMMemberStats(cid, 'pilot'),
        });
    }
});

function buildColumn(column: DashboardColumn): ColumnView {
    const key = mapDashboardColumnToAircraftKey(column);
    const label = dashboardColumnLabels[column];
    const rows: AircraftRow[] = [];
    let count = 0;

    let color: string = '';
    if (key === 'enroute') color = radarColors[getPilotStatus('enroute').color];
    if (key === 'prefiles') color = getAircraftStatusColor('neutral');
    if (key === 'groundDep') color = radarColors[getPilotStatus('depTaxi').color];
    if (key === 'groundArr') color = radarColors[getPilotStatus('arrTaxi').color];
    if (key === 'departures') color = radarColors[getPilotStatus('departed').color];
    if (key === 'arrivals') color = radarColors[getPilotStatus('arriving').color];

    if (key === 'enroute') {
        for (const pilot of enrouteAircraft.value) {
            if (airportAircraft.value.has(pilot.cid)) continue;
            rows.push({ type: 'pilot', key: `enroute-${ pilot.cid }`, pilot, statusKey: key, color: null });
            count++;
        }
        return { column, key, label, count, rows, color };
    }

    if (GROUPED_KEYS.has(key)) {
        for (const icao of sortByPriorityAirports(airportList.value)) {
            const raw = aircraftRefs.value[icao]?.value?.[key as keyof AirportPopupPilotList] ?? [];
            if (!raw.length) continue;
            const pilots = key === 'prefiles' ? raw.slice() : sortGround(raw);
            rows.push({ type: 'header', key: `head-${ column }-${ icao }`, icao, color: getAirportAircraftColor(icao) });
            for (const pilot of pilots) {
                rows.push({ type: 'pilot', key: `${ column }-${ icao }-${ pilot.cid }`, pilot, statusKey: key, color: null });
                count++;
            }
        }

        return { column, key, label, count, rows, color };
    }

    const entries: { pilot: AirportPopupPilotStatus; icao: string; color: string | null }[] = [];
    for (const icao of airportList.value) {
        const raw = aircraftRefs.value[icao]?.value?.[key as keyof AirportPopupPilotList] ?? [];
        for (const pilot of raw) entries.push({ pilot, icao, color: getAirportAircraftColor(icao) });
    }
    entries.sort((a, b) => {
        const priority = Number(isColoredAirport(b.icao)) - Number(isColoredAirport(a.icao));
        if (priority !== 0) return priority;
        return key === 'departures' ? a.pilot.flown - b.pilot.flown : arrivalsComparator(a.pilot, b.pilot);
    });
    for (const entry of entries) {
        rows.push({ type: 'pilot', key: `${ column }-${ entry.icao }-${ entry.pilot.cid }`, pilot: entry.pilot, statusKey: key, color: entry.color });
        count++;
    }
    return { column, key, label, count, rows, color };
}

const columns = computed<ColumnView[]>(() => COLUMN_ORDER.map(buildColumn));

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

function pilotStatus(pilot: AirportPopupPilotStatus, key: DashboardAircraftKey): ReturnType<typeof getPilotStatus> {
    switch (key) {
        case 'prefiles':
            return { color: 'lightGray500', title: 'Prefile' };
        case 'groundDep':
            return getPilotStatus('depTaxi');
        case 'groundArr':
            return getPilotStatus('arrTaxi');
        case 'departures':
            return getPilotStatus((pilot.distance !== 0 && pilot.flown < 40) ? 'departed' : 'enroute');
        case 'arrivals':
            return getPilotStatus((pilot.distance !== 0 && pilot.distance < 40) ? 'arriving' : 'enroute');
        case 'enroute':
            return getPilotStatus('enroute');
        default:
            return getPilotStatus('enroute');
    }
}

function pilotBottomItems(pilot: AirportPopupPilotStatus, key: DashboardAircraftKey): string[] {
    const items: string[] = [];
    if (pilot.departure && pilot.arrival) items.push(`${ pilot.departure } → ${ pilot.arrival }`);
    items.push(pilot.aircraft_faa ?? 'No flight plan');

    const airborne = key === 'departures' || key === 'arrivals' || key === 'enroute';
    if (airborne && pilot.distance) items.push(`${ Math.round(pilot.distance) }NM remains`);
    if (airborne && pilot.eta) {
        const remains = getTimeRemains(pilot.eta);
        if (remains) items.push(`in ${ remains }`);
    }
    return items;
}

function selectPilot(pilot: AirportPopupPilotStatus) {
    selected.value = selected.value === pilot.cid ? null : pilot.cid;
}

const horizontal = computed(() => {
    const location = activeDashboard.value?.mapLocation ?? 'right';
    return location === 'above' || location === 'below';
});

const openColumns = computed(() => activeDashboard.value?.openColumns ?? [...dashboardColumns]);
const collapsed = ref<Set<DashboardColumn>>(new Set());

function toggleColumn(column: DashboardColumn) {
    const next = new Set(collapsed.value);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    collapsed.value = next;
    router.replace({ query: { ...route.query, cols: next.size ? [...next].join(',') : undefined } });
}

onMounted(() => {
    const query = route.query.cols;
    if (typeof query === 'string') {
        collapsed.value = new Set(query.split(',').filter((column): column is DashboardColumn => (dashboardColumns as readonly string[]).includes(column)));
    }
    else {
        collapsed.value = new Set(dashboardColumns.filter(column => !openColumns.value.includes(column)));
    }

    for (const el of pilotsRefs.value) {
        observer.observe(el);
    }
});

onUpdated(() => {
    for (const el of pilotsRefs.value) {
        observer.observe(el);
    }
});

onBeforeUnmount(() => {
    observer.disconnect();
});

defineExpose({ combinedAircraft });
</script>

<style scoped lang="scss">
.dashboard-aircraft {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &_rate {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    &_columns {
        display: flex;
        flex-direction: column;
        gap: 12px;

        &--horizontal {
            overflow-x: auto;
            flex-direction: row;
            align-items: flex-start;
            padding-bottom: 4px;
        }
    }

    &_col {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        gap: 8px;

        min-width: 0;

        @at-root .dashboard-aircraft_columns--horizontal & {
            min-width: 240px;

            .dashboard-aircraft_col_body {
                flex-direction: column;
                max-height: 260px;
            }
        }

        &_head {
            cursor: pointer;

            display: flex;
            gap: 8px;
            align-items: center;

            padding: 6px 8px;
            border: 1px solid $darkGray800;
            border-radius: 6px;

            background: $darkGray900;

            transition: 0.3s;

            @include hover {
                &:hover {
                    border-color: $blue500;
                }
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
                flex-grow: 1;
                color: var(--color);
            }
        }

        &_body {
            overflow: auto;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            max-height: 15dvh;
            padding-right: 2px;
        }
    }

    &_group {
        display: flex;
        gap: 6px;
        align-items: center;

        width: 100%;
        margin-top: 4px;

        font-size: 12px;
        font-weight: 700;
        color: $lightGray500;

        &_color {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
    }

    &_empty {
        padding: 8px;
        font-size: 12px;
        color: $lightGray500;
    }

    &_pilot {
        content-visibility: auto;
        contain-intrinsic-size: auto 50px;

        &--bordered {
            border-left: 3px solid var(--airport-color);
        }

        &--selected {
            outline: 1px solid $blue500;
        }

        &_head {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;
            align-items: center;
            justify-content: space-between;

            width: 100%;

            &_cs {
                font-weight: 700;
                color: $lightGray200;
            }

            &_status {
                font-size: 11px;
                color: var(--color);
            }
        }
    }
}
</style>
