import { computed } from 'vue';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';
import type { DashboardAirport, DashboardColumn } from '~/utils/shared/dashboard';

export type DashboardAircraftKey = MapAircraftKeys | 'enroute';

const columnToAircraftKey: Record<DashboardColumn, DashboardAircraftKey> = {
    prefiles: 'prefiles',
    departing: 'groundDep',
    enroute: 'enroute',
    departed: 'departures',
    arriving: 'arrivals',
    landed: 'groundArr',
};

export function mapDashboardColumnToAircraftKey(column: DashboardColumn): DashboardAircraftKey {
    return columnToAircraftKey[column];
}

export function mapDashboardColumnsToAircraftKeys(columns: DashboardColumn[]): DashboardAircraftKey[] {
    return columns.map(mapDashboardColumnToAircraftKey);
}

export function useDashboard() {
    const store = useStore();

    const airportsMap = computed(() => {
        const map = new Map<string, DashboardAirport>();
        for (const airport of store.activeDashboard?.airports ?? []) {
            map.set(airport.icao, airport);
        }
        return map;
    });

    function getAirportAircraftColor(icao: string): string | null {
        return airportsMap.value.get(icao)?.aircraftColor ?? null;
    }

    function isPredictionAirport(icao: string): boolean {
        return airportsMap.value.get(icao)?.showInTrafficPrediction === true;
    }

    function isColoredAirport(icao: string): boolean {
        const airport = airportsMap.value.get(icao);
        if (!airport) return false;
        return !!airport.aircraftColor || airport.showInTrafficPrediction === true;
    }

    function sortByPriorityAirports<T>(items: T[], getIcao: (item: T) => string = item => item as unknown as string): T[] {
        return items.slice().sort((a, b) => Number(isColoredAirport(getIcao(b))) - Number(isColoredAirport(getIcao(a))));
    }

    return {
        activeDashboard: computed(() => store.activeDashboard),
        airportsMap,
        getAirportAircraftColor,
        isPredictionAirport,
        isColoredAirport,
        sortByPriorityAirports,
        mapDashboardColumnToAircraftKey,
        mapDashboardColumnsToAircraftKeys,
    };
}
