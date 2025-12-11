import { isVatGlassesActive, activeRunwayChanged, getVGData } from '~/utils/data/vatglasses';
import type { VatglassesAirportRunways } from '~/utils/data/vatglasses';
import type { RemovableRef } from '@vueuse/shared';

let runwayState: RemovableRef<Record<string, string>> | undefined;

export function getAirportRunways(icao: string): VatglassesAirportRunways | null {
    const dataStore = useDataStore();
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!runways || !isVatGlassesActive.value) return null;

    runwayState ??= useStorageLocal<Record<string, string>>('vg-runways', {});

    if (runwayState.value[icao] && runways.active !== runwayState.value[icao]) {
        setAirportActiveRunway(icao, runwayState.value[icao]);
    }

    return runways;
}

export async function setAirportActiveRunway(icao: string, active: string) {
    const dataStore = useDataStore();
    const vatglassesData = await getVGData();
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!vatglassesData || !runways) return null;

    runwayState ??= useStorageLocal<Record<string, string>>('vg-runways', {});

    runwayState.value[icao] = active;
    triggerRef(runwayState);

    runways.active = runwayState.value[icao];
    triggerRef(dataStore.vatglassesActiveRunways);
    return activeRunwayChanged(icao);
}
