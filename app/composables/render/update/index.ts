import { updateVATGlasses } from '~/composables/render/update/vatglasses';
import type { DataAirport, DataSector } from '~/composables/render/storage';
import { updateAircraft } from '~/composables/render/update/aircraft';

export interface DataUpdateContext { airports: Record<string, DataAirport>; sectors: Record<string, DataSector>; atcAdded: Set<string> | null; airportsAdded: Set<string> }

export async function updateControllersRender() {
    const dataStore = useDataStore();

    const airports: Record<string, DataAirport> = {};
    const sectors: Record<string, DataSector> = {};
    const context: DataUpdateContext = {
        airports,
        sectors,
        atcAdded: null,
        airportsAdded: new Set(),
    };

    for (const airport in dataStore.airportsList.value) {
        airports[airport] = Object.assign({}, dataStore.airportsList.value[airport]);
        airports[airport].aircraft = {};
        airports[airport].atc = [];
    }

    updateAircraft(context);

    await updateVATGlasses(context);
}
