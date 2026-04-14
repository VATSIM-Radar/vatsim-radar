import { updateVATGlasses } from '~/composables/render/update/vatglasses';
import type { DataAirport, DataSector } from '~/composables/render/storage';
import { updateAircraft } from '~/composables/render/update/aircraft';
import { updateControllers } from '~/composables/render/update/atc';

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
        airports[airport].aircraftCount = 0;
        airports[airport].atc = [];
        airports[airport].features = [];
    }

    updateAircraft(context);

    await updateVATGlasses(context);
    await updateControllers(context);

    for (const airport in context.airports) {
        if (!context.airportsAdded.has(airport)) delete context.airports[airport];
    }

    dataStore.airportsList.value = context.airports;
    dataStore.sectorsList.value = Object.values(context.sectors);

    dataStore.atcAddedDuringUpdate.value.clear();

    if (context.atcAdded) {
        dataStore.atcAddedDuringUpdate.value = context.atcAdded;
    }
}
