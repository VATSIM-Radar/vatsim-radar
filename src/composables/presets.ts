import type { SiteConfig } from '~/store';
import { useStore } from '~/store';
import type { MapAircraftMode } from '~/types/map';
import { fromLonLat } from 'ol/proj';

const saPreset: SiteConfig = {
    hideAirports: false,
    hideSectors: false,
    theme: 'sa',
    hideHeader: true,
    hideFooter: true,
    allAircraftGreen: true,
    hideAllExternal: true,
};

const idPreset: SiteConfig = {
    theme: 'default',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    area: [
        fromLonLat([5.9999611, 91.9999972].reverse()),
        fromLonLat([-9.8339778, 141.0003861].reverse()),
    ],
};

const carPreset: SiteConfig = {
    theme: 'light',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    center: fromLonLat([18.924940, -71.652160].reverse()),
    zoom: 5,
    onlyAirportsAircraft: true,
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
    else if (query.preset === 'id') {
        preset = idPreset;
    }
    else if (query.preset === 'car') {
        preset = carPreset;
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
