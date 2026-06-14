import type VectorSource from 'ol/source/Vector.js';
import type VectorLayer from 'ol/layer/Vector.js';
import type VectorImageLayer from 'ol/layer/VectorImage.js';
import type { VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import { allPilotsOnGround, ownFlight } from '~/composables/vatsim/pilots';
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import { getZoomScaleMultiplier } from '~/utils/map/aircraft-scale';
import type { Coordinate } from 'ol/coordinate.js';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureAircraftLine, FeatureAircraftProperties } from '~/utils/map/entities';
import { Point } from 'ol/geom.js';
import type { StoreOverlayPilot } from '~/store/map';
import { degreesToRadians } from '@turf/helpers';
import { aircraftIcons } from '~/utils/icons';
import { createDefaultStyle } from 'ol/style/Style.js';
import { setAircraftLineStyle, setAircraftStyle } from '~/composables/render/aircraft/style';
import { updateAircraftTracksData } from '~/composables/render/aircraft/tracks';
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
}

function getAircraftScale(pilot: VatsimShortenedAircraft | undefined, coordinates: Coordinate, icon: string) {
    const baseScale = getKeyedValueFromSettings('map.preferences.aircraft.scale');
    if (!isDynamicAircraftScale.value || !pilot) return baseScale;

    const iconWidth = radarIcons[icon as keyof typeof radarIcons].width;
    const lat = coordinates[1];
    const pilotStatus = pilot.status;
    const isPilotOnGround = pilotStatus === 'depGate' || pilotStatus === 'depTaxi' || pilotStatus === 'arrTaxi' || pilotStatus === 'arrGate';

    return +(baseScale * getZoomScaleMultiplier({ zoom: useMapStore().zoom, baseScale, iconPixelWidth: iconWidth, latitude: lat, isPilotOnGround })).toFixed(3);
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

    const overlays = Object.fromEntries(mapStore.overlays.filter(x => x.type === 'pilot').map(x => [+x.key, x]));

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
        const scale = getAircraftScale(pilot, coordinates, aircraft.icon);
        const icon = 'icon' in aircraft ? aircraftIcons[aircraft.icon] : getAircraftIcon(aircraft);

        const existingFeature = getMapFeature('aircraft', source, aircraft.cid);

        const renderState: AircraftRenderState = {
            pilot,
            aircraft,
            selfFlight: isSelfFlight,
            overlay,
            showTracks: !!tracks[aircraft.cid]?.show,
            isOnGround,
            status: 'default',
            tracksFeatures: linesFeaturesMap[aircraft.cid] ?? [],
            coordinates,
        };

        const status = getAircraftStatus(renderState, dataStore.airportsList.value);

        renderState.status = status;

        const properties: FeatureAircraftProperties = {
            id: aircraft.cid,
            cid: aircraft.cid,
            type: 'aircraft',
            status,
            icon,
            callsign: pilot?.callsign,
            rotation: degreesToRadians(heading ?? 0),
            heading,
            scale,
            onGround: isOnGround,
            coordinates,
        };

        if (existingFeature) {
            existingFeature.getGeometry()!.setCoordinates(coordinates);
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

    for (const cid in dataStore.vatsim.tracksPilotsData.value) {
        if (!keyedShownPilots.has(+cid)) delete dataStore.vatsim.tracksPilotsData.value[cid];
    }
}
