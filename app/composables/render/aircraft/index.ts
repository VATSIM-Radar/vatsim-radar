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
import { isSmoothMovementEnabled } from '~/composables/render/aircraft/smooth';
import { aircraftState } from './state';
import type { DataAirport } from '~/composables/render/storage';
import type { PartialRecord } from '~/types';

export interface TrackData { show: 'short' | 'full'; pilot: VatsimShortenedAircraft; isShown: boolean; isDeparture?: boolean; isArrival?: boolean }

export interface AircraftRenderSettings {
    source: VectorSource;
    layer: VectorLayer;

    linesSource: VectorSource;
    linesLayer: VectorImageLayer;

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

function getAircraftStatus({ pilot, selfFlight, aircraft, overlay, showTracks, isOnGround }: AircraftRenderState, airportsMap: PartialRecord<string, DataAirport>): MapAircraftStatus {
    const store = useStore();

    if (selfFlight || store.config.allAircraftGreen) return 'green';

    const isEmergency = getKeyedValueFromSettings('map.traffic.highlightEmergency') && (pilot?.transponder === '7700' || pilot?.transponder === '7600' || pilot?.transponder === '7601' || pilot?.transponder === '7500');

    if (isEmergency) {
        return 'emergency';
    }

    // color aircraft icon based on departure/arrival when the airport dashboard is in use
    if (store.config.airport && !overlay) {
        const vatAirport = airportsMap[store.config.airport];
        if (vatAirport?.aircraft.groundDep?.includes(aircraft.cid)) return 'departing';
        if (vatAirport?.aircraft.departures?.includes(aircraft.cid)) return 'default';
        if (vatAirport?.aircraft.groundArr?.includes(aircraft.cid)) return 'landed';
        if (vatAirport?.aircraft.arrivals?.includes(aircraft.cid)) return 'arriving';
    }

    if (store.config.airports && !overlay) {
        for (const airport of store.config.airports) {
            const vatAirport = airportsMap[airport];
            if (vatAirport?.aircraft.groundDep?.includes(aircraft.cid)) return 'departing';
            if (vatAirport?.aircraft.departures?.includes(aircraft.cid)) return 'default';
            if (vatAirport?.aircraft.groundArr?.includes(aircraft.cid)) return 'landed';
            if (vatAirport?.aircraft.arrivals?.includes(aircraft.cid)) return 'arriving';
        }
    }

    if (overlay || (showTracks && !isOnGround)) return 'active';

    return isOnGround ? 'ground' : 'default';
}

export async function setMapAircraft(settings: {
    source: VectorSource;
    layer: VectorLayer;

    linesSource: VectorSource;
    linesLayer: VectorImageLayer;

    shownPilots: VatsimMandatoryPilot[];
    tracks: Record<string, TrackData>;
}) {
    const { source, layer, linesLayer, linesSource, shownPilots, tracks } = settings;

    if (layer.getStyle() === createDefaultStyle) {
        setAircraftStyle(layer);
    }

    if (linesLayer.getStyle() === createDefaultStyle) {
        setAircraftLineStyle(linesLayer);
    }

    const dataStore = useDataStore();
    const mapStore = useMapStore();

    // Suspension pauses applying interpolated coordinates, but smoothing still owns the
    // existing feature geometry so a regular data update cannot snap it to server time.
    const smoothMovementEnabled = isSmoothMovementEnabled();
    const overlays = Object.fromEntries(mapStore.overlays.filter(x => x.type === 'pilot').filter(x => !isPilotOverlayParked(x)).map(x => [+x.key, x]));

    const linesFeatures = linesSource.getFeatures().slice(0);
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
        const smoothFeatureProperties = smoothMovementEnabled && existingFeature
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

        const status = getAircraftStatus(renderState, dataStore.airportsList.value);

        renderState.color = getAircraftStatusColor(status, aircraft.cid);
        renderState.status = status;

        const scale = getAircraftScale(featureCoordinates, aircraft.icon, isOnGround);

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
        };

        if (existingFeature) {
            if (!smoothMovementEnabled) existingFeature.getGeometry()!.setCoordinates(coordinates);
            existingFeature.setProperties(properties);
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
            delete aircraftState[feature.getId() as number];
        }
    }

    pruneAircraftStyleCache(keyedShownPilots);

    for (const cid in dataStore.vatsim.tracksPilotsData.value) {
        if (!keyedShownPilots.has(+cid)) delete dataStore.vatsim.tracksPilotsData.value[cid];
    }
}
