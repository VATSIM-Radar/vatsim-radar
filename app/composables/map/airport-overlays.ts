import type { StoreOverlayAirport, PartialOverlayParams } from '~/store/map';
import { useMapStore } from '~/store/map';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]/index';

interface AirportOverlayTabs {
    aircraftTab?: StoreOverlayAirport['data']['aircraftTab'];
    aircraftGroundMode?: StoreOverlayAirport['data']['aircraftGroundMode'];
    tab?: StoreOverlayAirport['data']['tab'];
}

type AddAirportOverlay = (
    airport: string,
    options?: AirportOverlayTabs,
    params?: PartialOverlayParams<StoreOverlayAirport>,
) => Promise<unknown>;

function normalizeIcaos(airports: string[]) {
    // Deduplicate before building the request because the response is keyed by ICAO.
    return [...new Set(airports.map(icao => icao.trim().toUpperCase()).filter(icao => icao.length === 4))];
}

/**
 * Fetch airport info once, then let the caller restore overlays in its original order with its original settings.
 */
export async function withBulkAirportOverlays<T>(airports: string[], callback: (addAirport: AddAirportOverlay) => Promise<T>): Promise<T> {
    const mapStore = useMapStore();
    const icaos = normalizeIcaos(airports);
    // Existing overlays already own their data and should not be fetched or replaced during restoration.
    const missingIcaos = icaos.filter(icao => !mapStore.overlays.some(overlay => overlay.key === icao));
    let airportData: Record<string, VatsimAirportData> = {};

    if (missingIcaos.length) {
        try {
            airportData = await $fetch<Record<string, VatsimAirportData>>('/api/data/vatsim/airports', {
                query: { airports: missingIcaos.join(',') },
                timeout: 15000,
            });
        }
        catch (error) {
            console.error(error);
            // Still restore the overlay shells if the batch info request fails.
        }
    }

    const addAirport: AddAirportOverlay = async (rawIcao, options, params) => {
        const icao = rawIcao.trim().toUpperCase();
        if (icao.length !== 4) return;

        const existingOverlay = mapStore.overlays.find(overlay => overlay.key === icao);
        if (existingOverlay) return mapStore.addAirportOverlay(icao, options, params);

        // Seed the store action with bulk info and skip per-airport requests during restoration.
        return mapStore.addAirportOverlay(icao, options, {
            ...params,
            data: {
                ...params?.data,
                airport: airportData[icao],
            },
        }, { fetchData: false });
    };

    return await callback(addAirport);
}
