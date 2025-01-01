import type { CookieRef } from '#app';
import type { VatglassesAirportRunways } from '~/utils/data/vatglasses';
import { activeRunwayChanged, isVatGlassesActive } from '~/utils/data/vatglasses';

let runwayCookie: CookieRef<Record<string, string>> | undefined;

export function getAirportRunways(icao: string): VatglassesAirportRunways | null {
    const dataStore = useDataStore();
    const vatglassesData = dataStore?.vatglasses?.value?.data;
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!vatglassesData || !runways || !isVatGlassesActive().value) return null;

    runwayCookie ??= useCookie<Record<string, string>>('vg-runways', {
        path: '/',
        sameSite: 'lax',
        secure: true,
        default: () => ({}),
    });

    if (runwayCookie.value[icao] && runways.active !== runwayCookie.value[icao]) {
        setAirportActiveRunway(icao, runwayCookie.value[icao]);
    }

    return runways;
}

export function setAirportActiveRunway(icao: string, active: string) {
    const dataStore = useDataStore();
    const vatglassesData = dataStore?.vatglasses?.value?.data;
    const runways = dataStore?.vatglassesActiveRunways.value[icao];

    if (!vatglassesData || !runways) return null;

    runwayCookie ??= useCookie<Record<string, string>>('vg-runways', {
        path: '/',
        sameSite: 'lax',
        secure: true,
        default: () => ({}),
    });

    runwayCookie.value[icao] = active;
    triggerRef(runwayCookie);

    runways.active = runwayCookie.value[icao];
    triggerRef(dataStore.vatglassesActiveRunways);
    return activeRunwayChanged(icao);
}