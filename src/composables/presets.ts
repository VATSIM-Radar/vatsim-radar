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
    showCornerLogo: true,
};

const idPreset: SiteConfig = {
    theme: 'default',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    area: [
        [5.9999611, 91.9999972].reverse(),
        [-9.8339778, 141.0003861].reverse(),
    ],
    showCornerLogo: true,
};

const carPreset: SiteConfig = {
    theme: 'light',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    center: [18.924940, -71.652160].reverse(),
    zoom: 5,
    onlyAirportsAircraft: true,
    showCornerLogo: false,
};

const colPreset: SiteConfig = {
    theme: 'default',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    area: [[6.651113079688614, -92.23834051546821].reverse(), [-4.768948971763558, -57.005187602811105].reverse()],
    onlyAirportsAircraft: true,
    showCornerLogo: true,
};

const urvPreset: SiteConfig = {
    theme: 'default',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    onlyAirportAircraft: true,
    onlyAirportsAircraft: true,
    showCornerLogo: true,
};

const vatsupPreset: SiteConfig = {
    theme: 'default',
    hideHeader: true,
    hideFooter: true,
    showCornerLogo: false,
    hideOverlays: true,
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

const myulllSmallPreset: SiteConfig = {
    theme: 'light',
    hideHeader: true,
    hideFooter: true,
    hideAllExternal: true,
    hideOverlays: true,
    center: [59.61687, 30.96264].reverse(),
    zoom: 7.45,
    onlyAirportsAircraft: true,
    showCornerLogo: false,
};

const myulllLargePreset: SiteConfig = {
    theme: 'light',
    hideHeader: true,
    hideFooter: true,
    hideOverlays: true,
    center: [62.99630, 44.72724].reverse(),
    zoom: 5.21,
    showCornerLogo: false,
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
    else if (query.preset === 'col') {
        preset = colPreset;
    }
    else if (query.preset === 'urv') {
        preset = urvPreset;
    }
    else if (query.preset === 'dashboard') {
        preset = dashboardPreset;
    }
    else if (query.preset === 'vatsup') {
        preset = vatsupPreset;
    }
    else if (query.preset === 'myulllsmall') {
        preset = myulllSmallPreset;
    }
    else if (query.preset === 'myullllarge') {
        preset = myulllLargePreset;
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
