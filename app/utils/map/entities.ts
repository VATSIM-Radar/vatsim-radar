import { Feature } from 'ol';
import type { Geometry, LineString, MultiLineString, Point } from 'ol/geom.js';
import type Polygon from 'ol/geom/Polygon.js';
import type MultiPolygon from 'ol/geom/MultiPolygon.js';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type VectorSource from 'ol/source/Vector';
import type { SigmetCombined, SimAwareProperties } from '~/utils/server/storage';
import type { VatsimNattrak, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { MapAircraftKeys, MapAircraftList } from '~/types/map';
import type { Coordinate } from 'ol/coordinate.js';
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import type { AircraftIconType } from '../icons';
import type { HeadingPair } from '~/utils/map/distance';
import type {
    NavDataFlightLevel,
    NavigraphNavDataAirportWaypointConstraints, NavigraphNavDataEnrouteWaypointPartial, NavigraphNavDataShort,
} from '~/utils/server/navigraph/navdata/types';

export const globalMapEntities = {
    airports: null as VectorSource | null,
    sectors: null as VectorSource | null,
};

export interface FeatureAirportProperties {
    type: 'airport';
    icao: string;
    iata?: string;
    name: string;
    color: string;
    lat: number;
    lon: number;
    atc: VatsimShortenedController[];
    atcLength: number;
    isPseudo: boolean;
    aircraftList: MapAircraftList;

    id: `airport-${ string }`;
}

interface FeatureAirportApproachPropertiesDefault {
    icao: string;
    iata?: string;
    featureId?: string;
    traconId?: string;
    atc: VatsimShortenedController[];
    isTWR: boolean;
    isDuplicated: boolean;
    isBooked: boolean;
    selected?: boolean;
}

export interface FeatureAirportApproachProperties extends FeatureAirportApproachPropertiesDefault {
    type: 'airport-circle' | 'airport-tracon';
    id: `airport-${ string }-${ string }`;
}

export interface FeatureAirportApproachTextProperties extends FeatureAirportApproachPropertiesDefault {
    type: 'airport-circle-label' | 'airport-tracon-label';
    name?: string;
    id: `airport-${ string }-${ string }`;
    atcLength: number;
    aircraftList: MapAircraftList;
}

export interface FeatureAirportFacility {
    facility: number;
    atc: VatsimShortenedController[];
}

export interface FeatureAirportAirportAtcProperties {
    type: 'airport-atc';
    icao: string;
    iata?: string;
    index: number;
    totalCount: number;
    selected?: boolean;
    id: `airport-${ string }-${ number }`;
    facility: FeatureAirportFacility;
}

export interface FeatureAirportAirportCounterProperties {
    type: 'airport-counter';
    icao: string;
    iata?: string;
    index: number;
    totalCount: number;
    counter: number;
    aircraft: VatsimShortenedPrefile[];
    atcLength: number;
    localsLength: number;
    aircraftList: MapAircraftList;
    counterType: MapAircraftKeys | 'training';
    id: `airport-${ string }-${ MapAircraftKeys | 'training' }`;
}

export interface FeatureAirportNavigraphProperties {
    type: 'airport-navigraph';
    identifier?: string;
    ident?: string;
    idlin?: string;
    color?: number;
    gateColor?: string;
    style?: number;
    catstop?: number;
    idthr?: string;
    brngtrue?: number;
    plysttyp?: number;
    idrwy?: string;
    idapron?: string;
    airport: string;
    trulyOccupied?: boolean;
    maybeOccupied?: boolean;
    featureType: 'gate' | 'runway' | 'layer';
    id: `airport-${ string }-${ 'gate' | 'runway' | 'layer' }-${ string }`;
}

export interface FeatureAirportSectorDefaultProperties {
    id: `sector-${ string }`;
    type: 'sector';
    sectorType: 'empty' | 'fir' | 'uir';
    selected?: boolean;
    booked: boolean;
    duplicated: boolean;
    icao: string;
    uir?: string;
    name: string;
    isOceanic: boolean;
    label: Coordinate;
    atc: VatsimShortenedController[];
}

export interface FeatureAirportSectorVGProperties {
    type: 'sector-vatglasses';
    sectorType: 'vatglasses';
    id?: never;
    vgSectorId: string;
    selected?: boolean;
    min: number;
    max: number;
    countryGroupId: string;
    positionId: string;
    lastLevelOrCombined: number | boolean;
    atc: VatsimShortenedController[];
    colour: string;
}

export interface FeatureAircraftProperties {
    id: number;
    type: 'aircraft';
    status: MapAircraftStatus;
    icon: AircraftIconType;
    coordinates: Coordinate;
    callsign?: string;
    scale: number;
    rotation: number;
    heading: number;
    cid: number;
    selected?: boolean;
    onGround: boolean;
}

export interface FeatureAircraftLineProperties {
    id: `${ number }-${ 'arrival' | 'departure' | `timestamp-${ string }` }`;
    type: 'aircraft-line';
    lineType: 'aircraft' | 'arrival-straight' | 'departure-straight' | 'departure-line' | 'loaded' | 'arrival-line';
    timestamp?: string;
    color: string | number | null;
    cid: number;
    status: MapAircraftStatus;
}

export interface FeatureSIGMETProperties extends Omit<SigmetCombined, 'id'> {
    type: 'sigmet';
    id: string;
}

export interface FeatureDistanceProperties {
    type: 'distance';
    id: number;
    headings?: HeadingPair;
    length: string;
}

export interface FeatureNavigraphItemProperties extends Partial<NavigraphNavDataAirportWaypointConstraints> {
    type: 'navigraph';
    id: string;
    currentFlight?: boolean;
    identifier?: string;
    waypoint?: string;
    key?: string;
    dbType: keyof NavigraphNavDataShort | NavigraphNavDataEnrouteWaypointPartial['kind'] | null;
    featureType: 'airways' | 'airways-waypoint' | 'waypoint' | 'nat-waypoint' | 'enroute' | `enroute-${ string }` | 'procedure' | `procedure-${ string }` | 'ndb' | 'vhf' | 'holdings' | `holdings-${ string }`;
    usage?: string;
    description?: string;
    self?: boolean;
    kind?: string;
    name?: string;
    ident?: string;
    dme?: string | null;
    frequency?: number;
    flightLevel?: NavDataFlightLevel;
    inbound?: number;
    outbound?: number;
    procedure?: string;
    time?: number;
    course?: number;
    turns?: 'L' | 'R';
    icaoCode?: string;
    areaCode?: string;
    pointCoordinate?: Coordinate;
    direction?: VatsimNattrak['direction'];
}

export type FeatureAirport = Feature<Point, FeatureAirportProperties>;
export type FeatureAirportApproach = Feature<Polygon, FeatureAirportApproachProperties>;
export type FeatureAirportApproachLabel = Feature<Point, FeatureAirportApproachTextProperties>;
export type FeatureAirportAtc = Feature<Point, FeatureAirportAirportAtcProperties>;
export type FeatureAirportCounter = Feature<Point, FeatureAirportAirportCounterProperties>;
export type FeatureAirportNavigraph = Feature<Point, FeatureAirportNavigraphProperties>;

export type FeatureSector = Feature<Polygon | MultiPolygon, FeatureAirportSectorDefaultProperties>;
export type FeatureSectorVG = Feature<Polygon | MultiPolygon, FeatureAirportSectorVGProperties>;

export type FeatureSimAware = Feature<Polygon | MultiPolygon, SimAwareProperties & { type: 'simaware' }>;

export type FeatureAircraft = Feature<Point, FeatureAircraftProperties>;
export type FeatureAircraftLine = Feature<LineString | MultiLineString, FeatureAircraftLineProperties>;

export type FeatureSigmet = Feature<Geometry, FeatureSIGMETProperties>;
export type FeatureDistance = Feature<LineString, FeatureDistanceProperties>;
export type FeatureNavigraph = Feature<Geometry, FeatureNavigraphItemProperties>;

export type MapFeatures =
    | FeatureAirport
    | FeatureAirportApproach
    | FeatureAirportApproachLabel
    | FeatureAirportAtc
    | FeatureAirportCounter
    | FeatureAirportNavigraph
    | FeatureSector
    | FeatureSectorVG
    | FeatureSimAware
    | FeatureAircraft
    | FeatureAircraftLine
    | FeatureSigmet
    | FeatureDistance
    | FeatureNavigraph;

export type MapFeaturesType = ReturnType<MapFeatures['getProperties']>['type'];

type FeatureForType<T extends MapFeaturesType> =
    MapFeatures extends infer F
        ? F extends MapFeatures
            ? T extends ReturnType<F['getProperties']>['type']
                ? F
                : never
            : never
        : never;

export type MapFeatureProperties<T extends MapFeaturesType> = ReturnType<FeatureForType<T>['getProperties']>;
export type MapFeatureGeometry<T extends MapFeaturesType> = Exclude<ReturnType<FeatureForType<T>['getGeometry']>, undefined>;

export function createMapFeature<T extends MapFeaturesType>(
    type: T,
    settings: ObjectWithGeometry<MapFeatureGeometry<T>, MapFeatureProperties<T>>,
): FeatureForType<T> {
    const feature = new Feature(settings);
    if ('id' in settings) feature.setId(settings.id);
    return feature as FeatureForType<T>;
}

export function getMapFeature<T extends MapFeaturesType>(
    type: T,
    source: VectorSource,
    id: MapFeatureProperties<T>['id'],
): FeatureForType<T> | null {
    return source.getFeatureById(id!) as FeatureForType<T> | null;
}

export function isMapFeature<T extends MapFeaturesType>(type: T, properties: Record<string, any>): properties is MapFeatureProperties<T> {
    return properties.type === type;
}
