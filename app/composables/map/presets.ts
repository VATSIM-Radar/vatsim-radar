import type { SiteConfig } from '~/store';
import { useStore } from '~/store';
import type { MapAircraftMode } from '~/types/map';
import { themesList, type ThemesList } from '~/utils/colors';
import type { PublicDashboard } from '~/utils/server/handlers/dashboards';
import type { UserFilter } from '~/utils/server/handlers/filters';
import { checkForUpdates, checkForVATSpy } from '~/composables/init';
import { withBulkAirportOverlays } from '~/composables/map/airport-overlays';
import { setUserTemporaryFilter } from '~/composables/fetchers/filters';

export function appendMapPresetFilterQuery(params: URLSearchParams, query: ReturnType<typeof useRoute>['query']) {
    const arrayKeys = [
        'filterPilotsCallsigns',
        'filterAtcCallsigns',
        'filterCids',
        'filterDepartureAirports',
        'filterArrivalAirports',
        'filterDepartureAirportsPrefix',
        'filterArrivalAirportsPrefix',
    ] as const;

    for (const key of arrayKeys) {
        const value = query[key];
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) params.set(key, value.filter((item): item is string => typeof item === 'string').join(','));
    }

    for (const key of ['filterStatus', 'filterType', 'filterPlan'] as const) {
        const value = query[key];
        if (typeof value === 'string') params.set(key, value);
    }
}

const saPreset: SiteConfig = {
    hideAirports: false,
    hideSectors: false,
    hideHeader: true,
    hideFooter: true,
    allAircraftGreen: true,
    hideAllExternal: true,
    showCornerLogo: true,
};

const iframePreset: SiteConfig = {
    hideAirports: false,
    hideSectors: false,
    hideHeader: true,
    hideFooter: true,
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
    hideOverlays: false,
    onlyAirportAircraft: false,
    onlyAirportsAircraft: false,
    showInfoForPrimaryAirport: true,
    hideBookings: true,
};

const settingsPreset: SiteConfig = {
    hideHeader: true,
    hideFooter: true,
    hidePaddings: true,
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

function createPresetFilterFromQuery(query: ReturnType<typeof useRoute>['query']): NonNullable<SiteConfig['filter']> {
    const filterQuery = {
        pilotsCallsigns: query.filterPilotsCallsigns,
        atcCallsigns: query.filterAtcCallsigns,
        cids: query.filterCids,
        departureAirports: query.filterDepartureAirports,
        arrivalAirports: query.filterArrivalAirports,
        departureAirportsPrefix: query.filterDepartureAirportsPrefix,
        arrivalAirportsPrefix: query.filterArrivalAirportsPrefix,
        status: query.filterStatus,
        type: query.filterType,
        plan: query.filterPlan,
    } satisfies Record<keyof NonNullable<SiteConfig['filter']>, unknown>;
    const arrayFilterKeys = ['pilotsCallsigns', 'atcCallsigns', 'cids', 'departureAirports', 'arrivalAirports', 'departureAirportsPrefix', 'arrivalAirportsPrefix'] as const;
    const filter = Object.fromEntries(arrayFilterKeys.flatMap(key => {
        const value = filterQuery[key];
        if (typeof value === 'string') return [[key, value.split(',').filter(Boolean)]];
        if (Array.isArray(value)) return [[key, value.filter((item): item is string => typeof item === 'string').flatMap(item => item.split(',').filter(Boolean))]];
        return [];
    })) as NonNullable<SiteConfig['filter']>;

    if (typeof filterQuery.status === 'string') filter.status = filterQuery.status as NonNullable<SiteConfig['filter']>['status'];
    if (typeof filterQuery.type === 'string') filter.type = filterQuery.type as NonNullable<SiteConfig['filter']>['type'];
    if (typeof filterQuery.plan === 'string') filter.plan = filterQuery.plan as NonNullable<SiteConfig['filter']>['plan'];

    return filter;
}

function createUserFilterFromPresetFilter(filter: NonNullable<SiteConfig['filter']>): UserFilter {
    const users: NonNullable<UserFilter['users']> = {};
    const airports: NonNullable<UserFilter['airports']> = {};
    const flights: NonNullable<UserFilter['flights']> = {};

    if (filter.pilotsCallsigns?.length) users.pilots = { type: 'prefix', value: filter.pilotsCallsigns };
    if (filter.atcCallsigns?.length) users.atc = { type: 'prefix', value: filter.atcCallsigns };
    if (filter.cids?.length) users.cids = filter.cids.filter(cid => /^\d+$/.test(cid)).map(Number);
    if (filter.departureAirports?.length) airports.departure = filter.departureAirports;
    if (filter.arrivalAirports?.length) airports.arrival = filter.arrivalAirports;
    if (filter.departureAirportsPrefix?.length) airports.departurePrefix = filter.departureAirportsPrefix;
    if (filter.arrivalAirportsPrefix?.length) airports.arrivalPrefix = filter.arrivalAirportsPrefix;
    if (filter.status) flights.status = filter.status;
    if (filter.type) flights.type = filter.type;
    if (filter.plan) flights.plan = filter.plan;

    return {
        ...(Object.keys(users).length ? { users } : {}),
        ...(Object.keys(airports).length ? { airports } : {}),
        ...(Object.keys(flights).length ? { flights } : {}),
    };
}

export async function checkAndSetMapPreset() {
    const query = useRoute().query;
    const store = useStore();
    const dataStore = useDataStore();

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
    else if (query.preset === 'embed') {
        preset = iframePreset;
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
    else if (query.preset === 'settings' || query.preset === 'vatrus') {
        preset = settingsPreset;
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

    if (typeof query.dashboard === 'string') {
        preset.dashboardId = query.dashboard;

        if (typeof window !== 'undefined') {
            const dashboard = await $fetch<PublicDashboard>(`/api/data/dashboard/${ preset.dashboardId }`).then(x => {
                store.activeDashboard = x.json;
                return x.json;
            }).catch(() => {});

            if (!dashboard) {
                await checkForVATSpy();
                const airport = dataStore.vatspy.value?.data.keyAirports.realIcao[preset.dashboardId];
                if (airport) {
                    // @ts-expect-error empty schema
                    store.activeDashboard = {
                        airports: [{
                            icao: airport.icao,
                            showInTrafficPrediction: true,
                        }],
                    };
                }
            }
        }
    }

    if (query.airportAircraft) {
        preset.onlyAirportAircraft = query.airportAircraft === '1';
        preset.onlyAirportsAircraft = query.airportAircraft === '1';
    }

    if (typeof query.airports === 'string') {
        preset.airports = query.airports.split(',').map(x => x.toUpperCase());
        preset.hideSectors = false;
        preset.hideAirports = false;

        if (typeof window !== 'undefined' && store.activeDashboard && store.activeDashboard?.showArrivalTracks !== false && query.tracks !== '0') {
            nextTick().then(async () => {
                await checkForUpdates();
                await checkForVATSpy();

                await withBulkAirportOverlays(preset.airports!, async addAirport => {
                    for (const airport of preset.airports!) {
                        await addAirport(airport, undefined, {
                            minified: true,
                            collapsed: true,
                            data: {
                                showTracks: true,
                            },
                            dontSave: true,
                        });
                    }
                });
            });
        }
        else if (store.activeDashboard?.showArrivalTracks === false) {
            preset.hideOverlays = true;
        }
    }

    if (typeof query.airport === 'string') {
        preset.airport = query.airport.toUpperCase();
        preset.hideSectors = true;
    }

    if (typeof query.atcCallsign === 'string') {
        preset.mainAtcCallsign = query.atcCallsign.toUpperCase();
    }

    if (typeof query.airportMode === 'string' && query.airportMode) {
        preset.airportMode = query.airportMode as MapAircraftMode;
    }

    const filter = createPresetFilterFromQuery(query);
    if (Object.keys(filter).length) {
        preset.filter = filter;
        setUserTemporaryFilter(createUserFilterFromPresetFilter(filter));
    }

    store.config = preset;
    if (typeof query.theme === 'string' && (query.theme === 'default' || query.theme in themesList)) {
        preset.theme = query.theme as ThemesList;
    }
    if (preset.theme) store.theme = preset.theme;
}
