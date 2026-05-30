import type { SigmetType, UserLegacyLocalSettings } from '~/types/map';
import type { UserMapLegacySettings } from '~/utils/server/handlers/map-settings';
import type { UserSettings } from '~/utils/server/user';
import type { UserSettingsV2Partial } from '~/utils/settings/types';
import type { colorsList, legacyColorsList } from '~/utils/colors';

const sigmetTypes = ['TS', 'VA', 'FZLVL', 'WS', 'WIND', 'ICE', 'TURB', 'MTW', 'IFR', 'OBSC', 'CONV'] satisfies SigmetType[];
export const legacyColorToV2Color = {
    mapSectorBorder: 'darkGray500',
    divertedBackground: 'red500',
    divertedTextColor: 'lightGray900',

    lightgray0: 'lightGray100',
    lightgray50: 'lightGray200',
    lightgray100: 'lightGray300',
    lightgray125: 'lightGray400',
    lightgray150: 'lightGray500',
    lightgray200: 'lightGray600',

    darkgray1000: 'darkGray900',
    darkgray950: 'darkGray800',
    darkgray900: 'darkGray700',
    darkgray875: 'darkGray600',
    darkgray850: 'darkGray500',
    darkgray800: 'darkGray400',

    primary300: 'blue300',
    primary400: 'blue400',
    primary500: 'blue500',
    primary600: 'blue600',
    primary700: 'blue700',

    success300: 'green700',
    success400: 'green700',
    success500: 'green700',
    success600: 'green800',
    success700: 'green800',

    warning300: 'orange400',
    warning400: 'orange400',
    warning500: 'orange500',
    warning600: 'orange500',
    warning700: 'orange600',

    error300: 'citrus600',
    error400: 'citrus600',
    error500: 'citrus700',
    error600: 'citrus700',
    error700: 'citrus700',

    info300: 'purple400',
    info400: 'purple500',
    info500: 'purple500',
    info600: 'purple600',
    info700: 'purple700',
} satisfies Record<keyof typeof legacyColorsList, keyof typeof colorsList>;

function setValue(settings: UserSettingsV2Partial, path: string, value: unknown) {
    if (value === undefined) return;

    const parts = path.split('.');
    let current = settings as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
            current[part] = {};
        }

        current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
}

function setInvertedBoolean(settings: UserSettingsV2Partial, path: string, value: boolean | undefined) {
    if (typeof value === 'boolean') setValue(settings, path, !value);
}

export function migrateLegacyColor(color: string): string {
    return legacyColorToV2Color[color as keyof typeof legacyColorToV2Color] ?? color;
}

function migrateLegacyColors<T>(value: T): T {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(migrateLegacyColors) as T;

    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
        result[key] = key === 'color' && typeof item === 'string'
            ? migrateLegacyColor(item)
            : migrateLegacyColors(item);
    }

    return result as T;
}

export function migrateV1Settings({ localSettings = {}, mapSettings = {}, userSettings = {} }: {
    localSettings?: UserLegacyLocalSettings;
    mapSettings?: UserMapLegacySettings;
    userSettings?: UserSettings;
}): UserSettingsV2Partial {
    const settings: UserSettingsV2Partial = {};

    // userSettings: persisted account-level settings from `/api/user/settings`.
    setValue(settings, 'appearance.headerName', userSettings.headerName);
    setValue(settings, 'appearance.timeFormat', userSettings.timeFormat);
    setValue(settings, 'appearance.favoriteSort', userSettings.favoriteSort);

    setValue(settings, 'map.preferences.autoFollow', userSettings.autoFollow);
    setValue(settings, 'map.preferences.autoZoom', userSettings.autoZoom);

    setValue(settings, 'map.traffic.showFullRoute', userSettings.showFullRoute);
    setValue(settings, 'map.traffic.toggleAircraftOverlays', userSettings.toggleAircraftOverlays);
    setValue(settings, 'map.traffic.autoShowAirportTracks', userSettings.autoShowAirportTracks);

    // localSettings: browser-local map settings stored outside presets.
    setValue(settings, 'appearance.eventsLocalTimezone', localSettings.eventsLocalTimezone);
    setValue(settings, 'appearance.notamsSortBy', localSettings.filters?.notamsSortBy);

    setValue(settings, 'map.preferences.debugMode', localSettings.debugMode);
    setValue(settings, 'map.preferences.featuredDefaultBookmarks', localSettings.featuredDefaultBookmarks);
    setValue(settings, 'map.preferences.skipBookmarkAnimation', localSettings.skipBookmarkAnimation);
    setValue(settings, 'map.preferences.showTotalDeparturesInFeaturedAirports', localSettings.traffic?.showTotalDeparturesInFeaturedAirports);
    setValue(settings, 'map.preferences.searchBy', localSettings.traffic?.searchBy);
    setValue(settings, 'map.preferences.searchLimit', localSettings.traffic?.searchLimit);

    // @ts-expect-error incorrect value can be here sometimes
    setValue(settings, 'map.layers.weather', (localSettings.filters?.layers?.weather2 === false || localSettings.filters?.layers?.weather2 === 'false') ? null : localSettings.filters?.layers?.weather2);
    setValue(settings, 'map.layers.layer', localSettings.filters?.layers?.layer);
    setValue(settings, 'map.layers.layerLabels', localSettings.filters?.layers?.layerLabels);
    setValue(settings, 'map.layers.relativeIndicator', localSettings.filters?.layers?.relativeIndicator);
    setValue(settings, 'map.layers.terminator', localSettings.filters?.layers?.terminator);
    setValue(settings, 'map.layers.transparency', localSettings.filters?.layers?.transparencySettings);
    setValue(settings, 'map.layers.natTrak.enabled', localSettings.natTrak?.enabled);
    setValue(settings, 'map.layers.natTrak.concorde', localSettings.natTrak?.showConcorde);
    setValue(settings, 'map.layers.natTrak.direction', localSettings.natTrak?.direction);
    setValue(settings, 'map.layers.distance.enabled', localSettings.distance?.enabled);
    setValue(settings, 'map.layers.distance.units', localSettings.distance?.units);
    setValue(settings, 'map.layers.distance.interaction', typeof localSettings.distance?.ctrlClick === 'boolean' ? (localSettings.distance.ctrlClick ? 'ctrlclick' : 'dblclick') : undefined);

    setValue(settings, 'map.traffic.disableFastUpdate', localSettings.traffic?.disableFastUpdate);

    setInvertedBoolean(settings, 'map.navigraph.enabled', localSettings.disableNavigraph);
    setInvertedBoolean(settings, 'map.navigraph.routeParsing.enabled', localSettings.disableNavigraphRoute);
    setInvertedBoolean(settings, 'map.navigraph.routeParsing.enabledOnHover', localSettings.disableNavigraphRouteHover);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.enabled', localSettings.navigraphRouteAirportOverlay?.enabled);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.sid', localSettings.navigraphRouteAirportOverlay?.sid);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.star', localSettings.navigraphRouteAirportOverlay?.star);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.holds', localSettings.navigraphRouteAirportOverlay?.holds);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.labels', localSettings.navigraphRouteAirportOverlay?.labels);
    setValue(settings, 'map.navigraph.routeParsing.airportOverlay.waypoints', localSettings.navigraphRouteAirportOverlay?.waypoints);

    setValue(settings, 'sigmets.showOnMap', localSettings.filters?.layers?.sigmets?.enabled);
    setValue(settings, 'sigmets.enabled', localSettings.filters?.layers?.sigmets?.disabled
        ? sigmetTypes.filter(type => !localSettings.filters?.layers?.sigmets?.disabled?.includes(type))
        : undefined);
    setValue(settings, 'sigmets.showAirmets', localSettings.filters?.layers?.sigmets?.showAirmets);
    setValue(settings, 'sigmets.raw', localSettings.filters?.layers?.sigmets?.raw);

    // mapSettings: legacy map preset settings.
    setValue(settings, 'appearance.bookingsLocalTimezone', mapSettings.bookingsLocalTimezone);

    setInvertedBoolean(settings, 'map.preferences.enableQueryUpdate', mapSettings.disableQueryUpdate);
    setValue(settings, 'map.preferences.overlaysPositions', mapSettings.overlaysPositions);

    setValue(settings, 'map.preferences.aircraft.shortView', mapSettings.shortAircraftView);
    setValue(settings, 'map.preferences.aircraft.scale', mapSettings.aircraftScale);
    setValue(settings, 'map.preferences.aircraft.dynamicScale', mapSettings.dynamicAircraftScale);
    setValue(settings, 'map.preferences.aircraft.tracks.mode', mapSettings.tracks?.mode);
    setValue(settings, 'map.preferences.aircraft.tracks.showOutOfBounds', mapSettings.tracks?.showOutOfBounds);
    setValue(settings, 'map.preferences.aircraft.tracks.limit', mapSettings.tracks?.limit);
    setValue(settings, 'map.preferences.aircraft.showLimit', mapSettings.pilotLabelLimit);

    setValue(settings, 'map.preferences.airports.defaultZoomLevel', mapSettings.defaultAirportZoomLevel);
    setValue(settings, 'map.preferences.airports.shortView', mapSettings.shortAirportView);
    setValue(settings, 'map.preferences.airports.showMode', mapSettings.airportsMode);
    setValue(settings, 'map.preferences.airports.declutterIf', mapSettings.airportsHide);
    setValue(settings, 'map.preferences.airports.ATISAsUnstaffed', mapSettings.hideATISOnly);
    setValue(settings, 'map.preferences.airports.groundTraffic.hide', mapSettings.groundTraffic?.hide);
    setValue(settings, 'map.preferences.airports.groundTraffic.excludeMyArrival', mapSettings.groundTraffic?.excludeMyArrival);
    setValue(settings, 'map.preferences.airports.groundTraffic.excludeMyLocation', mapSettings.groundTraffic?.excludeMyLocation);
    setValue(settings, 'map.preferences.airports.departuresCountInOverlay', mapSettings.airportsCounters?.syncWithOverlay);
    setValue(settings, 'map.preferences.airports.counters.enabled', mapSettings.airportsCounters?.showCounters);
    setValue(settings, 'map.preferences.airports.counters.syncDeparturesArrivals', mapSettings.airportsCounters?.syncDeparturesArrivals);
    setValue(settings, 'map.preferences.airports.counters.departuresMode', mapSettings.airportsCounters?.departuresMode);
    setValue(settings, 'map.preferences.airports.counters.arrivalsMode', mapSettings.airportsCounters?.arrivalsMode);
    setValue(settings, 'map.preferences.airports.counters.horizontalCounter', mapSettings.airportsCounters?.horizontalCounter);
    setValue(settings, 'map.preferences.airports.counters.disableTraining', mapSettings.airportsCounters?.disableTraining);
    setValue(settings, 'map.preferences.airports.showLimit', mapSettings.airportCounterLimit);

    setValue(settings, 'map.preferences.colors.light', migrateLegacyColors(mapSettings.colors?.light));
    setValue(settings, 'map.preferences.colors.default', migrateLegacyColors(mapSettings.colors?.default));
    setValue(settings, 'map.preferences.colors.turns', mapSettings.colors?.turns);
    setValue(settings, 'map.preferences.colors.turnsTransparency', mapSettings.colors?.turnsTransparency);

    setValue(settings, 'map.layers.heatmap', mapSettings.heatmapLayer);

    setValue(settings, 'map.traffic.declutter', mapSettings.aircraftDeclutter);
    setValue(settings, 'map.traffic.highlightEmergency', mapSettings.highlightEmergency);

    setValue(settings, 'map.vatglasses.active', mapSettings.vatglasses?.active);
    setValue(settings, 'map.vatglasses.autoEnable', mapSettings.vatglasses?.autoEnable);
    setValue(settings, 'map.vatglasses.autoLevel', mapSettings.vatglasses?.autoLevel);
    setValue(settings, 'map.vatglasses.combined', mapSettings.vatglasses?.combined);

    setValue(settings, 'map.navigraph.layers.ndb', mapSettings.navigraphData?.ndb);
    setValue(settings, 'map.navigraph.layers.vordme', mapSettings.navigraphData?.vordme);
    setValue(settings, 'map.navigraph.layers.waypoints', mapSettings.navigraphData?.waypoints);
    setValue(settings, 'map.navigraph.layers.terminalWaypoints', mapSettings.navigraphData?.terminalWaypoints);
    setValue(settings, 'map.navigraph.layers.holdings', mapSettings.navigraphData?.holdings);
    setValue(settings, 'map.navigraph.layers.ifrMode', mapSettings.navigraphData?.mode);
    setValue(settings, 'map.navigraph.layers.ifrAuto', mapSettings.navigraphData?.isModeAuto);
    setValue(settings, 'map.navigraph.layers.airways', mapSettings.navigraphData?.airways);
    setInvertedBoolean(settings, 'map.navigraph.airport.enabled', mapSettings.navigraphLayers?.disable);
    setInvertedBoolean(settings, 'map.navigraph.airport.taxiways', mapSettings.navigraphLayers?.hideTaxiways);
    setInvertedBoolean(settings, 'map.navigraph.airport.gateGuidance', mapSettings.navigraphLayers?.hideGateGuidance);
    setInvertedBoolean(settings, 'map.navigraph.airport.runwayExit', mapSettings.navigraphLayers?.hideRunwayExit);
    setInvertedBoolean(settings, 'map.navigraph.airport.deicing', mapSettings.navigraphLayers?.hideDeicing);

    if (typeof mapSettings.visibility?.atc === 'boolean') {
        setValue(settings, 'map.visibility.atc.firs', mapSettings.visibility.atc);
        setValue(settings, 'map.visibility.atc.approach', mapSettings.visibility.atc);
        setValue(settings, 'map.visibility.atc.ground', mapSettings.visibility.atc);
    }
    else {
        setValue(settings, 'map.visibility.atc.firs', mapSettings.visibility?.atc?.firs);
        setValue(settings, 'map.visibility.atc.approach', mapSettings.visibility?.atc?.approach);
        setValue(settings, 'map.visibility.atc.ground', mapSettings.visibility?.atc?.ground);
    }

    setValue(settings, 'map.visibility.atcLabels', mapSettings.visibility?.atcLabels);
    setValue(settings, 'map.visibility.airports', mapSettings.visibility?.airports);
    setValue(settings, 'map.visibility.pilots', mapSettings.visibility?.pilots);
    setValue(settings, 'map.visibility.gates', mapSettings.visibility?.gates);
    setValue(settings, 'map.visibility.runways', mapSettings.visibility?.runways);
    setValue(settings, 'map.visibility.pilotsInfo', mapSettings.visibility?.pilotsInfo);
    setValue(settings, 'map.visibility.atcInfo', mapSettings.visibility?.atcInfo);
    setValue(settings, 'map.visibility.pilotLabels', mapSettings.visibility?.pilotLabels);

    setValue(settings, 'map.bookings.enabled', mapSettings.visibility?.bookings);
    setValue(settings, 'map.bookings.hours', typeof mapSettings.bookingHours === 'string' ? parseInt(mapSettings.bookingHours) : mapSettings.bookingHours);
    setValue(settings, 'map.events.enabled', mapSettings.visibility?.events);
    setValue(settings, 'map.events.hours', mapSettings.eventsHours);

    settings.version = '2.0';

    return settings;
}
