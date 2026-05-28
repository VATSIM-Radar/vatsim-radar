import { useStore } from '~/store';
import type { UserMapSettings } from '~/utils/server/handlers/map-settings';
import type { UserLocalSettings } from '~/types/map';
import { customDefu } from '~/composables';
import type { UserSettingsV2 } from '~/utils/settings/types';

export function setUserLocalSettings(settings?: UserLocalSettings) {
    const store = useStore();

    const settingsText = localStorage.getItem('local-settings') ?? '{}';
    if (!settings && JSON.stringify(store.localSettings) === settingsText) return;

    let localSettings = JSON.parse(settingsText) as UserLocalSettings;
    localSettings = customDefu(settings || {}, localSettings);
    if (settings?.location) localSettings.location = settings.location;

    store.localSettings = localSettings;
    localStorage.setItem('local-settings', JSON.stringify(localSettings));
    applyLegacyLocalSettings(localSettings);
}

export function setUserMapSettings(settings?: UserMapSettings) {
    const settingsText = localStorage.getItem('map-settings') ?? '{}';
    if (!settings && settingsText === '{}') return;

    let mapSettings = JSON.parse(settingsText) as UserMapSettings;
    mapSettings = customDefu(settings || {}, mapSettings);

    localStorage.setItem('map-settings', JSON.stringify(mapSettings));
    applyLegacyMapSettings(mapSettings);
}

export async function resetUserMapSettings() {
    localStorage.removeItem('map-settings');
}

export async function fetchUserMapSettings() {
    const settings = await $fetch<UserMapSettings>('/api/user/settings/map');
    localStorage.setItem('map-settings', JSON.stringify(settings));
    applyLegacyMapSettings(settings);
}

function applyLegacyLocalSettings(settings: UserLocalSettings) {
    if (settings.debugMode !== undefined) setSettingByKey('map.preferences.debugMode', settings.debugMode);
    if (settings.featuredDefaultBookmarks !== undefined) setSettingByKey('map.preferences.featuredDefaultBookmarks', settings.featuredDefaultBookmarks);
    if (settings.skipBookmarkAnimation !== undefined) setSettingByKey('map.preferences.skipBookmarkAnimation', settings.skipBookmarkAnimation);
    if (settings.eventsLocalTimezone !== undefined) setSettingByKey('appearance.eventsLocalTimezone', settings.eventsLocalTimezone);
    if (settings.disableNavigraph !== undefined) setSettingByKey('map.navigraph.enabled', !settings.disableNavigraph);
    if (settings.disableNavigraphRoute !== undefined) setSettingByKey('map.navigraph.routeParsing.enabled', !settings.disableNavigraphRoute);
    if (settings.disableNavigraphRouteHover !== undefined) setSettingByKey('map.navigraph.routeParsing.enabledOnHover', !settings.disableNavigraphRouteHover);
    if (settings.sigmetsDate !== undefined) {
        const store = useStore();
        store.localSettings.sigmetsDate = settings.sigmetsDate;
    }

    if (settings.navigraphRouteAirportOverlay?.enabled !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.enabled', settings.navigraphRouteAirportOverlay.enabled);
    if (settings.navigraphRouteAirportOverlay?.sid !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.sid', settings.navigraphRouteAirportOverlay.sid);
    if (settings.navigraphRouteAirportOverlay?.star !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.star', settings.navigraphRouteAirportOverlay.star);
    if (settings.navigraphRouteAirportOverlay?.holds !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.holds', settings.navigraphRouteAirportOverlay.holds);
    if (settings.navigraphRouteAirportOverlay?.labels !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.labels', settings.navigraphRouteAirportOverlay.labels);
    if (settings.navigraphRouteAirportOverlay?.waypoints !== undefined) setSettingByKey('map.navigraph.routeParsing.airportOverlay.waypoints', settings.navigraphRouteAirportOverlay.waypoints);

    if (settings.natTrak?.enabled !== undefined) setSettingByKey('map.layers.natTrak.enabled', settings.natTrak.enabled);
    if (settings.natTrak?.showConcorde !== undefined) setSettingByKey('map.layers.natTrak.concorde', settings.natTrak.showConcorde);
    if (settings.natTrak?.direction !== undefined) setSettingByKey('map.layers.natTrak.direction', settings.natTrak.direction === 'both' ? 'all' : settings.natTrak.direction);

    if (settings.distance?.enabled !== undefined) setSettingByKey('map.layers.distance.enabled', settings.distance.enabled);
    if (settings.distance?.units !== undefined) setSettingByKey('map.layers.distance.units', settings.distance.units);
    if (settings.distance?.ctrlClick !== undefined) setSettingByKey('map.layers.distance.interaction', settings.distance.ctrlClick ? 'ctrlclick' : 'dblclick');

    if (settings.filters?.notamsSortBy !== undefined) setSettingByKey('appearance.notamsSortBy', settings.filters.notamsSortBy);
    if (settings.filters?.layers?.layer !== undefined) setSettingByKey('map.layers.layer', settings.filters.layers.layer);
    if (settings.filters?.layers?.layerLabels !== undefined) setSettingByKey('map.layers.layerLabels', settings.filters.layers.layerLabels);
    if (settings.filters?.layers?.relativeIndicator !== undefined) setSettingByKey('map.layers.relativeIndicator', settings.filters.layers.relativeIndicator === true ? 'metric' : settings.filters.layers.relativeIndicator);
    if (settings.filters?.layers?.terminator !== undefined) setSettingByKey('map.layers.terminator', settings.filters.layers.terminator);
    if (settings.filters?.layers?.weather2 !== undefined) setSettingByKey('map.layers.weather', settings.filters.layers.weather2 || null);

    if (settings.filters?.layers?.sigmets?.enabled !== undefined) setSettingByKey('sigmets.showOnMap', settings.filters.layers.sigmets.enabled);
    if (settings.filters?.layers?.sigmets?.showAirmets !== undefined) setSettingByKey('sigmets.showAirmets', settings.filters.layers.sigmets.showAirmets);
    if (settings.filters?.layers?.sigmets?.raw !== undefined) setSettingByKey('sigmets.raw', settings.filters.layers.sigmets.raw);
    if (settings.filters?.layers?.sigmets?.disabled !== undefined) {
        const allSigmets = ['CONV', 'TS', 'ICE', 'FZLVL', 'TURB', 'MTW', 'WIND', 'WS', 'IFR', 'OBSC', 'VA'] as const;
        setSettingByKey('sigmets.enabled', allSigmets.filter(x => !settings.filters?.layers?.sigmets?.disabled?.includes(x)));
    }

    const transparency = settings.filters?.layers?.transparencySettings;
    if (transparency?.osm !== undefined) setSettingByKey('map.layers.transparency.osm', transparency.osm);
    if (transparency?.satellite !== undefined) setSettingByKey('map.layers.transparency.satellite', transparency.satellite);
    if (transparency?.weatherDark !== undefined) setSettingByKey('map.layers.transparency.weatherDark', transparency.weatherDark);
    if (transparency?.weatherLight !== undefined) setSettingByKey('map.layers.transparency.weatherLight', transparency.weatherLight);
    if (transparency?.sigmets !== undefined) setSettingByKey('map.layers.transparency.sigmets', transparency.sigmets);

    if (settings.traffic?.disableFastUpdate !== undefined) setSettingByKey('map.traffic.disableFastUpdate', settings.traffic.disableFastUpdate);
    if (settings.traffic?.showTotalDeparturesInFeaturedAirports !== undefined) setSettingByKey('map.preferences.showTotalDeparturesInFeaturedAirports', settings.traffic.showTotalDeparturesInFeaturedAirports);
    if (settings.traffic?.searchBy !== undefined) setSettingByKey('map.preferences.searchBy', settings.traffic.searchBy);
    if (settings.traffic?.searchLimit !== undefined) setSettingByKey('map.preferences.searchLimit', settings.traffic.searchLimit);
}

function applyLegacyMapSettings(settings: UserMapSettings) {
    if (settings.bookingsLocalTimezone !== undefined) setSettingByKey('appearance.bookingsLocalTimezone', settings.bookingsLocalTimezone);
    if (settings.disableQueryUpdate !== undefined) setSettingByKey('map.preferences.enableQueryUpdate', !settings.disableQueryUpdate);
    if (settings.shortAircraftView !== undefined) setSettingByKey('map.preferences.aircraft.shortView', settings.shortAircraftView);
    if (settings.shortAirportView !== undefined) setSettingByKey('map.preferences.airports.shortView', settings.shortAirportView);
    if (settings.overlaysPositions !== undefined) setSettingByKey('map.preferences.overlaysPositions', settings.overlaysPositions);
    if (settings.aircraftDeclutter !== undefined) setSettingByKey('map.traffic.declutter', settings.aircraftDeclutter);
    if (settings.defaultAirportZoomLevel !== undefined) setSettingByKey('map.preferences.airports.defaultZoomLevel', settings.defaultAirportZoomLevel);
    if (settings.heatmapLayer !== undefined) setSettingByKey('map.layers.heatmap', settings.heatmapLayer);
    if (settings.highlightEmergency !== undefined) setSettingByKey('map.traffic.highlightEmergency', settings.highlightEmergency);
    if (settings.aircraftScale !== undefined) setSettingByKey('map.preferences.aircraft.scale', settings.aircraftScale);
    if (settings.dynamicAircraftScale !== undefined) setSettingByKey('map.preferences.aircraft.dynamicScale', settings.dynamicAircraftScale);
    if (settings.airportsMode !== undefined) setSettingByKey('map.preferences.airports.showMode', settings.airportsMode);
    if (settings.airportsHide !== undefined) setSettingByKey('map.preferences.airports.declutterIf', settings.airportsHide);
    if (settings.hideATISOnly !== undefined) setSettingByKey('map.preferences.airports.ATISAsUnstaffed', settings.hideATISOnly);
    if (settings.airportCounterLimit !== undefined) setSettingByKey('map.preferences.airports.showLimit', settings.airportCounterLimit);
    if (settings.pilotLabelLimit !== undefined) setSettingByKey('map.preferences.aircraft.showLimit', settings.pilotLabelLimit);
    if (settings.bookingHours !== undefined) setSettingByKey('map.bookings.hours', settings.bookingHours);
    if (settings.eventsHours !== undefined) setSettingByKey('map.events.hours', settings.eventsHours);

    if (settings.visibility?.bookings !== undefined) setSettingByKey('map.bookings.enabled', settings.visibility.bookings);
    if (settings.visibility?.events !== undefined) setSettingByKey('map.events.enabled', settings.visibility.events);
    if (settings.visibility?.atcLabels !== undefined) setSettingByKey('map.visibility.atcLabels', !settings.visibility.atcLabels);
    if (settings.visibility?.pilotLabels !== undefined) setSettingByKey('map.visibility.pilotLabels', !settings.visibility.pilotLabels);
    if (settings.visibility?.airports !== undefined) setSettingByKey('map.visibility.airports', !settings.visibility.airports);
    if (settings.visibility?.pilots !== undefined) setSettingByKey('map.visibility.pilots', !settings.visibility.pilots);
    if (settings.visibility?.gates !== undefined) setSettingByKey('map.visibility.gates', !settings.visibility.gates);
    if (settings.visibility?.runways !== undefined) setSettingByKey('map.visibility.runways', !settings.visibility.runways);
    if (settings.visibility?.pilotsInfo !== undefined) setSettingByKey('map.visibility.pilotsInfo', !settings.visibility.pilotsInfo);
    if (settings.visibility?.atcInfo !== undefined) setSettingByKey('map.visibility.atcInfo', !settings.visibility.atcInfo);
    if (settings.visibility?.atc === false) {
        setSettingByKey('map.visibility.atc.firs', false);
        setSettingByKey('map.visibility.atc.approach', false);
        setSettingByKey('map.visibility.atc.ground', false);
    }
    else if (typeof settings.visibility?.atc === 'object') {
        if (settings.visibility.atc.firs !== undefined) setSettingByKey('map.visibility.atc.firs', !settings.visibility.atc.firs);
        if (settings.visibility.atc.approach !== undefined) setSettingByKey('map.visibility.atc.approach', !settings.visibility.atc.approach);
        if (settings.visibility.atc.ground !== undefined) setSettingByKey('map.visibility.atc.ground', !settings.visibility.atc.ground);
    }

    if (settings.vatglasses?.active !== undefined) setSettingByKey('map.vatglasses.active', settings.vatglasses.active);
    if (settings.vatglasses?.autoEnable !== undefined) setSettingByKey('map.vatglasses.autoEnable', settings.vatglasses.autoEnable);
    if (settings.vatglasses?.autoLevel !== undefined) setSettingByKey('map.vatglasses.autoLevel', settings.vatglasses.autoLevel);
    if (settings.vatglasses?.combined !== undefined) setSettingByKey('map.vatglasses.combined', settings.vatglasses.combined);

    if (settings.groundTraffic?.hide !== undefined) setSettingByKey('map.preferences.airports.groundTraffic.hide', settings.groundTraffic.hide);
    if (settings.groundTraffic?.excludeMyArrival !== undefined) setSettingByKey('map.preferences.airports.groundTraffic.excludeMyArrival', settings.groundTraffic.excludeMyArrival);
    if (settings.groundTraffic?.excludeMyLocation !== undefined) setSettingByKey('map.preferences.airports.groundTraffic.excludeMyLocation', settings.groundTraffic.excludeMyLocation);

    if (settings.tracks?.mode !== undefined) setSettingByKey('map.preferences.aircraft.tracks.mode', settings.tracks.mode);
    if (settings.tracks?.showOutOfBounds !== undefined) setSettingByKey('map.preferences.aircraft.tracks.showOutOfBounds', settings.tracks.showOutOfBounds);
    if (settings.tracks?.limit !== undefined) setSettingByKey('map.preferences.aircraft.tracks.limit', settings.tracks.limit);

    if (settings.airportsCounters?.showCounters !== undefined) setSettingByKey('map.preferences.airports.counters.enabled', settings.airportsCounters.showCounters);
    if (settings.airportsCounters?.syncDeparturesArrivals !== undefined) setSettingByKey('map.preferences.airports.counters.syncDeparturesArrivals', settings.airportsCounters.syncDeparturesArrivals);
    if (settings.airportsCounters?.departuresMode !== undefined) setSettingByKey('map.preferences.airports.counters.departuresMode', settings.airportsCounters.departuresMode);
    if (settings.airportsCounters?.arrivalsMode !== undefined) setSettingByKey('map.preferences.airports.counters.arrivalsMode', settings.airportsCounters.arrivalsMode);
    if (settings.airportsCounters?.horizontalCounter !== undefined) setSettingByKey('map.preferences.airports.counters.horizontalCounter', settings.airportsCounters.horizontalCounter);
    if (settings.airportsCounters?.disableTraining !== undefined) setSettingByKey('map.preferences.airports.counters.disableTraining', settings.airportsCounters.disableTraining);

    if (settings.navigraphLayers?.disable !== undefined) setSettingByKey('map.navigraph.airport.enabled', !settings.navigraphLayers.disable);
    if (settings.navigraphLayers?.hideTaxiways !== undefined) setSettingByKey('map.navigraph.airport.taxiways', !settings.navigraphLayers.hideTaxiways);
    if (settings.navigraphLayers?.hideGateGuidance !== undefined) setSettingByKey('map.navigraph.airport.gateGuidance', !settings.navigraphLayers.hideGateGuidance);
    if (settings.navigraphLayers?.hideRunwayExit !== undefined) setSettingByKey('map.navigraph.airport.runwayExit', !settings.navigraphLayers.hideRunwayExit);
    if (settings.navigraphLayers?.hideDeicing !== undefined) setSettingByKey('map.navigraph.airport.deicing', !settings.navigraphLayers.hideDeicing);

    if (settings.navigraphData?.airways?.enabled !== undefined) setSettingByKey('map.navigraph.layers.airways.enabled', settings.navigraphData.airways.enabled);
    if (settings.navigraphData?.airways?.showAirwaysLabel !== undefined) setSettingByKey('map.navigraph.layers.airways.showAirwaysLabel', settings.navigraphData.airways.showAirwaysLabel);
    if (settings.navigraphData?.airways?.showWaypointsLabel !== undefined) setSettingByKey('map.navigraph.layers.airways.showWaypointsLabel', settings.navigraphData.airways.showWaypointsLabel);
    if (settings.navigraphData?.mode !== undefined) setSettingByKey('map.navigraph.layers.ifrMode', settings.navigraphData.mode);
    if (settings.navigraphData?.isModeAuto !== undefined) setSettingByKey('map.navigraph.layers.ifrAuto', settings.navigraphData.isModeAuto);

    if (settings.colors?.turns !== undefined) setSettingByKey('map.preferences.colors.turns', settings.colors.turns);
    if (settings.colors?.turnsTransparency !== undefined) setSettingByKey('map.preferences.colors.turnsTransparency', settings.colors.turnsTransparency);

    for (const theme of ['default', 'light'] as const) {
        const colors = settings.colors?.[theme];
        if (!colors) continue;
        for (const [key, value] of Object.entries(colors)) {
            if (key === 'aircraft') continue;
            setSettingByKey(`map.preferences.colors.${ theme }.${ key }` as any, value as never);
        }
        for (const [key, value] of Object.entries(colors.aircraft ?? {}) as [keyof UserSettingsV2['map']['preferences']['colors']['default']['aircraft'], unknown][]) {
            setSettingByKey(`map.preferences.colors.${ theme }.aircraft.${ key }` as any, value as never);
        }
    }
}
