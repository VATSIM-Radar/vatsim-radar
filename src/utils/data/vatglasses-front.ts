import type { CookieRef } from '#app';
import { isVatGlassesActive, activeRunwayChanged, getVGData } from '~/utils/data/vatglasses';
import type { VatglassesAirportRunways } from '~/utils/data/vatglasses';

let runwayCookie: CookieRef<Record<string, string>> | undefined;

export async function getAirportRunways(icao: string): Promise<VatglassesAirportRunways | null> {
    const dataStore = useDataStore();
    const vatglassesData = await getVGData();
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!vatglassesData || !runways || !isVatGlassesActive.value) return null;

    runwayCookie ??= useCookie<Record<string, string>>('vg-runways', {
        path: '/',
        sameSite: 'none',
        secure: true,
        default: () => ({}),
    });

    if (runwayCookie.value[icao] && runways.active !== runwayCookie.value[icao]) {
        setAirportActiveRunway(icao, runwayCookie.value[icao]);
    }

    return runways;
}

export async function setAirportActiveRunway(icao: string, active: string) {
    const dataStore = useDataStore();
    const vatglassesData = await getVGData();
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!vatglassesData || !runways) return null;

    runwayCookie ??= useCookie<Record<string, string>>('vg-runways', {
        path: '/',
        sameSite: 'none',
        secure: true,
        default: () => ({}),
    });

    runwayCookie.value[icao] = active;
    triggerRef(runwayCookie);

    runways.active = runwayCookie.value[icao];
    triggerRef(dataStore.vatglassesActiveRunways);
    return activeRunwayChanged(icao);
}
