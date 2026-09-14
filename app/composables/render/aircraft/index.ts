import type VectorSource from 'ol/source/Vector.js';
import type VectorLayer from 'ol/layer/Vector.js';
import type VectorImageLayer from 'ol/layer/VectorImage.js';
import type { VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import { allPilotsOnGround, ownFlight } from '~/composables/vatsim/pilots';
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import { getAircraftDynamicScale } from '~/utils/map/aircraft-scale';
import type { Coordinate } from 'ol/coordinate.js';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureAircraftLine, FeatureAircraftProperties } from '~/utils/map/entities';
import { Point } from 'ol/geom.js';
import type { StoreOverlayPilot } from '~/store/map';
import { degreesToRadians } from '@turf/helpers';
import { aircraftIcons } from '~/utils/icons';
import { createDefaultStyle } from 'ol/style/Style.js';
import {
    isPilotOverlayParked,
    pruneAircraftStyleCache,
    setAircraftLineStyle,
    setAircraftStyle,
} from '~/composables/render/aircraft/style';
import { updateAircraftTracksData } from '~/composables/render/aircraft/tracks';
import {
    isSmoothMovementEnabled,
    isSmoothMovementSuspendedForLoad,
    resetSmoothAircraftPosition,
} from '~/composables/render/aircraft/smooth';
import { aircraftState, clearAircraftState } from './state';

export interface TrackData { show: 'short' | 'full'; pilot: VatsimShortenedAircraft; isShown: boolean; isDeparture?: boolean; isArrival?: boolean }

export interface AircraftRenderSettings {
    source: VectorSource;
    layer: VectorLayer;

    linesSource: VectorSource;
    linesLayer: VectorLayer;
    historySource: VectorSource;
    historyLayer: VectorImageLayer;

    shownPilots: VatsimMandatoryPilot[];
    tracks: Record<string, TrackData>;
}

export interface AircraftRenderState {
    aircraft: VatsimMandatoryPilot;
    pilot: VatsimShortenedAircraft | undefined;
    coordinates: Coordinate;
    selfFlight: boolean;
    overlay: StoreOverlayPilot | undefined;
    showTracks: boolean;
    isOnGround: boolean;
    status: MapAircraftStatus;
    tracksFeatures: FeatureAircraftLine[];
    color: string;
}

function getAircraftScale(coordinates: Coordinate, icon: string, isPilotOnGround: boolean) {
    const baseScale = getKeyedValueFromSettings('map.preferences.aircraft.scale');

    return getAircraftDynamicScale({
        icon,
        latitude: coordinates[1],
        isPilotOnGround,
        fallbackScale: baseScale,
    });
}

function getAircraftStatus({ pilot, selfFlight, aircraft, overlay, showTracks, isOnGround }: AircraftRenderState, airportsMap: ReadonlyMap<number, MapAircraftStatus>): MapAircraftStatus {
    const store = useStore();

    if (selfFlight || store.config.allAircraftGreen) return 'green';

    const isEmergency = getKeyedValueFromSettings('map.traffic.highlightEmergency') && (pilot?.transponder === '7700' || pilot?.transponder === '7600' || pilot?.transponder === '7601' || pilot?.transponder === '7500');

    if (isEmergency) {
        return 'emergency';
    }

    if (!overlay && airportsMap.has(aircraft.cid)) return airportsMap.get(aircraft.cid)!;

    if (overlay || (showTracks && !isOnGround)) return 'active';

    return isOnGround ? 'ground' : 'default';
}

export function setMapAircraft(settings: AircraftRenderSettings) {
    const { source, layer, linesLayer, linesSource, historySource, historyLayer, shownPilots, tracks } = settings;

    if (layer.getStyle() === createDefaultStyle) {
        setAircraftStyle(layer);
    }

    if (linesLayer.getStyle() === createDefaultStyle) {
        setAircraftLineStyle(linesLayer);
    }

    if (historyLayer.getStyle() === createDefaultStyle) setAircraftLineStyle(historyLayer);

    const dataStore = useDataStore();
    const mapStore = useMapStore();

    const smoothMovementEnabled = isSmoothMovementEnabled();
    // Map movement keeps the interpolated geometry until movement ends. Low zoom and excessive
    // aircraft load use mandatory coordinates directly so the performance fallback still moves.
    const useDirectCoordinates = smoothMovementEnabled && isSmoothMovementSuspendedForLoad(true);
    const overlays = Object.fromEntries(mapStore.overlays.filter(x => x.type === 'pilot').filter(x => !isPilotOverlayParked(x)).map(x => [+x.key, x]));

    const linesFeatures = [...linesSource.getFeatures(), ...historySource.getFeatures()];
    const linesFeaturesMap: Record<number, FeatureAircraftLine[]> = {};
    const keyedShownPilots = new Set(shownPilots.map(x => x.cid));

    for (const cid of Object.keys(dataStore.navigraphWaypoints.value)) {
        if (!keyedShownPilots.has(+cid) && +cid !== 1) {
            delete dataStore.navigraphWaypoints.value[cid];
            triggerRef(dataStore.navigraphWaypoints);
        }
    }

    for (const _feature of linesFeatures) {
        const feature = _feature as FeatureAircraftLine;
        const cid = feature.getProperties().cid;

        if (keyedShownPilots.has(cid)) {
            linesFeaturesMap[cid] ??= [];
            linesFeaturesMap[cid].push(feature);
        }
        else {
            feature.dispose();
            linesSource.removeFeature(feature);
            historySource.removeFeature(feature);
        }
    }

    const dashboardStatuses = new Map<number, MapAircraftStatus>();
    const config = useStore().config;
    for (const icao of config.airport ? [config.airport] : config.airports ?? []) {
        const categories = dataStore.airportsList.value[icao]?.aircraft;
        for (const [kind, status] of [['groundDep', 'departing'], ['departures', 'default'], ['groundArr', 'landed'], ['arrivals', 'arriving']] as const) {
            for (const cid of categories?.[kind] ?? []) {
                if (!dashboardStatuses.has(cid)) dashboardStatuses.set(cid, status);
            }
        }
    }

    for (const aircraft of shownPilots) {
        const isSelfFlight = aircraft?.cid === ownFlight.value?.cid;
        const actualAircraft = dataStore.vatsim.data.keyedPilots.value[aircraft.cid.toString()];

        if (isSelfFlight && dataStore.vatsim.selfCoordinate.value && dataStore.vatsim.localUpdateTime.value - dataStore.vatsim.selfCoordinate.value.date > 1000 * 5) {
            dataStore.vatsim.selfCoordinate.value = null;
        }

        const coordinates = (isSelfFlight && dataStore.vatsim.selfCoordinate.value)
            ? dataStore.vatsim.selfCoordinate.value.coordinate
            : [(actualAircraft ?? aircraft).longitude, (actualAircraft ?? aircraft).latitude];

        const heading = (isSelfFlight && dataStore.vatsim.selfCoordinate.value)
            ? dataStore.vatsim.selfCoordinate.value.heading
            : (actualAircraft ?? aircraft).heading;

        const pilot = dataStore.vatsim.data.keyedPilots.value[aircraft.cid] as VatsimShortenedAircraft | undefined;
        const overlay = overlays[aircraft.cid];
        const isOnGround = allPilotsOnGround.value.has(aircraft.cid);
        const icon = 'icon' in aircraft ? aircraftIcons[aircraft.icon] : getAircraftIcon(aircraft);

        const existingFeature = getMapFeature('aircraft', source, aircraft.cid);
        const directPosition = !smoothMovementEnabled || useDirectCoordinates || !mapStore.renderedPilots?.has(aircraft.cid);
        const smoothFeatureProperties = !directPosition && existingFeature
            ? existingFeature.getProperties()
            : undefined;
        const featureCoordinates = smoothFeatureProperties
            ? existingFeature!.getGeometry()!.getCoordinates()
            : coordinates;
        const featureHeading = smoothFeatureProperties?.heading ?? heading ?? 0;

        const renderState: AircraftRenderState = {
            pilot,
            aircraft,
            selfFlight: isSelfFlight,
            overlay,
            showTracks: !!tracks[aircraft.cid]?.show,
            isOnGround,
            status: 'default',
            tracksFeatures: linesFeaturesMap[aircraft.cid] ?? [],
            coordinates: featureCoordinates,
            color: '',
        };

        const status = getAircraftStatus(renderState, dashboardStatuses);

        renderState.color = getAircraftStatusColor(status, aircraft.cid);
        renderState.status = status;

        const scale = getAircraftScale(featureCoordinates, aircraft.icon, isOnGround);
        const filteredStyle = getFilteredAircraftSettings(aircraft.cid);

        const properties: FeatureAircraftProperties = {
            id: aircraft.cid,
            cid: aircraft.cid,
            type: 'aircraft',
            status,
            icon,
            callsign: pilot?.callsign,
            rotation: degreesToRadians(featureHeading),
            heading: featureHeading,
            scale,
            onGround: isOnGround,
            coordinates: featureCoordinates,
            color: renderState.color,
            departure: pilot?.departure,
            arrival: pilot?.arrival,
            filteredStyle,
        };

        if (existingFeature) {
            if (directPosition) {
                const geometry = existingFeature.getGeometry()! as Point;
                const existingCoordinates = geometry.getCoordinates();
                if (existingCoordinates[0] !== coordinates[0] || existingCoordinates[1] !== coordinates[1]) {
                    existingFeature.getGeometry()!.setCoordinates(coordinates);
                }
            }

            if (directPosition && smoothMovementEnabled) resetSmoothAircraftPosition(aircraft.cid, coordinates, heading ?? 0);

            const existingProperties = existingFeature.getProperties();
            const previousCoordinates = existingProperties.coordinates;
            if (previousCoordinates?.[0] !== featureCoordinates[0] || previousCoordinates?.[1] !== featureCoordinates[1]) {
                existingFeature.set('coordinates', featureCoordinates, true);
            }
            let changed = false;

            for (const key in properties) {
                if (key === 'coordinates') continue;

                // @ts-expect-error dynamic assignment
                if (existingProperties[key] !== properties[key]) changed = true;
            }

            if (changed) existingFeature.setProperties(properties);
        }
        else {
            const feature = createMapFeature('aircraft', {
                ...properties,
                geometry: new Point(coordinates),
            });

            source.addFeature(feature);
        }

        updateAircraftTracksData(settings, renderState);
    }

    const aircraft = source.getFeatures().slice(0);

    for (const feature of aircraft) {
        if (!keyedShownPilots.has(feature.getId() as number)) {
            feature.dispose();
            source.removeFeature(feature);
            clearAircraftState(feature.getId() as number);
        }
    }

    for (const cid in aircraftState) {
        if (!keyedShownPilots.has(+cid)) clearAircraftState(+cid);
    }

    pruneAircraftStyleCache(keyedShownPilots);

    for (const cid in dataStore.vatsim.tracksPilotsData.value) {
        if (!keyedShownPilots.has(+cid)) delete dataStore.vatsim.tracksPilotsData.value[cid];
    }
}
