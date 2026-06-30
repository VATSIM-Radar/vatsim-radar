import { updateVATGlasses } from '~/composables/render/update/vatglasses';
import type { DataAirport, DataSector } from '~/composables/render/storage';
import { updateAircraft } from '~/composables/render/update/aircraft';
import { updateControllers } from '~/composables/render/update/atc';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { useStore } from '~/store';
import { logBench } from '~/composables';
import { getKeyedValueFromSettings } from '~/composables/settings/v2/utils';

export interface DataUpdateContext { airports: Record<string, DataAirport>; sectors: Record<string, DataSector>; atcAdded: Set<string> | null; airportsAdded: Set<string> }

let vgFirstRun: boolean | undefined = true;

export async function updateControllersRender() {
    const dataStore = useDataStore();
    const store = useStore();
    const mapStore = useMapStore();

    const airports: Record<string, DataAirport> = {};
    const sectors: Record<string, DataSector> = {};
    const context: DataUpdateContext = {
        airports,
        sectors,
        atcAdded: null,
        airportsAdded: new Set(),
    };

    let log = logBench('updateAircraft');

    for (const airport in dataStore.airportsList.value) {
        airports[airport] = Object.assign({}, dataStore.airportsList.value[airport]);
        airports[airport].aircraft = {};
        airports[airport].aircraftCount = 0;
        airports[airport].atc = [];
        airports[airport].features = [];
    }

    updateAircraft(context);

    log();

    const isFirstRun = !!vgFirstRun;

    if (!dataStore.vatglassesCombiningInProgress.value) {
        log = logBench('updateVG');
        vgFirstRun = await updateVATGlasses(context);
        log();
    }
    log = logBench('updateATC');
    await updateControllers(context);

    for (const event of store.getEvents) {
        for (const airport of event.airports) {
            if (context.airportsAdded.has(airport.icao) || !dataStore.vatspy.value?.data.keyAirports.realIcao[airport.icao]) continue;
            context.airports[airport.icao] = {
                icao: airport.icao,
                airport: dataStore.vatspy.value?.data.keyAirports.realIcao[airport.icao],
                atc: [],
                aircraft: {
                    groundDep: [],
                    groundArr: [],
                    prefiles: [],
                    departures: [],
                    arrivals: [],
                },
                aircraftCount: 1,
                atis: {},
            };
            context.airportsAdded.add(airport.icao);
        }
    }

    for (const overlay of mapStore.overlays) {
        if (context.airportsAdded.has(overlay.key) || overlay.type !== 'airport' || !dataStore.vatspy.value?.data.keyAirports.realIcao[overlay.key]) continue;
        context.airports[overlay.key] = {
            icao: overlay.key,
            airport: dataStore.vatspy.value?.data.keyAirports.realIcao[overlay.key],
            atc: [],
            aircraft: {
                groundDep: [],
                groundArr: [],
                prefiles: [],
                departures: [],
                arrivals: [],
            },
            aircraftCount: 1,
            atis: {},
        };
        context.airportsAdded.add(overlay.key);
    }

    for (const airport in context.airports) {
        if (!context.airportsAdded.has(airport)) delete context.airports[airport];
    }

    dataStore.airportsList.value = context.airports;
    dataStore.sectorsList.value = Object.values(context.sectors);
    dataStore.sectorsUpdateId.value++;

    dataStore.atcAddedDuringUpdate.value.clear();

    if (context.atcAdded) {
        dataStore.atcAddedDuringUpdate.value = context.atcAdded;
    }

    log();

    if (isFirstRun && !vgFirstRun) {
        updateControllersRender();
    }
}

const vgLevel = computed(() => useStore().localSettings.vatglassesLevel);

export function initControllersUpdate() {
    const relevantSettings = computed(() => getKeyedValueFromSettings('map.vatglasses.combined'));
    useUpdateCallback(['short', isVatGlassesActive, runwaysState, debugControllers, debugBookings, relevantSettings], () => {
        updateControllersRender();
    });
}
