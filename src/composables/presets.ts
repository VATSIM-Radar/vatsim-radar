import type { SiteConfig } from '~/store';
import { useStore } from '~/store';
import type { MapAircraftMode } from '~/types/map';

const saPreset: SiteConfig = {
    hideAirports: false,
    hideSectors: false,
    theme: 'sa',
    hideHeader: true,
    hideFooter: true,
    allAircraftGreen: true,
    hideAllExternal: true,
};

const dashboardPreset: SiteConfig = {
    hideAirports: false,
    hideSectors: false,
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: false,
    hideOverlays: true,
    onlyAirportAircraft: true,
    showInfoForPrimaryAirport: true,
};

export function checkAndSetMapPreset() {
    const query = useRoute().query;
    const store = useStore();

    if (!query.preset) return;

    let preset: SiteConfig = {};

    if (query.preset === 'sa') {
        preset = saPreset;
    }
    else if (query.preset === 'dashboard') {
        preset = dashboardPreset;
    }

    preset = structuredClone(preset);

    if (typeof query.airports === 'string') {
        preset.airports = query.airports.split(',').map(x => x.toUpperCase());
        preset.hideSectors = false;
        preset.hideAirports = false;
    }

    if (typeof query.airport === 'string') {
        preset.airport = query.airport.toUpperCase();
        preset.hideSectors = true;
    }

    if (typeof query.airportMode === 'string' && query.airportMode) {
        preset.airportMode = query.airportMode as MapAircraftMode;
    }

    store.config = preset;
    if (preset.theme) store.theme = preset.theme;
}
