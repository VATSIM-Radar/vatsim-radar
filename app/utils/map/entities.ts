import { Feature } from 'ol';
import type { Point } from 'ol/geom.js';
import type Polygon from 'ol/geom/Polygon.js';
import type MultiPolygon from 'ol/geom/MultiPolygon.js';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type VectorSource from 'ol/source/Vector';
import type { SimAwareProperties } from '~/utils/server/storage';
import type { VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { MapAircraft, MapAircraftKeys } from '~/types/map';

export interface FeatureAirportProperties {
    type: 'airport';
    icao: string;
    iata?: string;
    name: string;
    color: string;
    lat: number;
    lon: number;
    atc: VatsimShortenedController[];
    localsLength: number;

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
}

export interface FeatureAirportApproachProperties extends FeatureAirportApproachPropertiesDefault {
    type: 'airport-circle' | 'airport-tracon';
    id: `airport-${ string }-${ string }`;
}

export interface FeatureAirportApproachTextProperties extends FeatureAirportApproachPropertiesDefault {
    type: 'airport-circle-label' | 'airport-tracon-label';
    name?: string;
    id: `airport-${ string }-${ string }`;
}

export interface FeatureAirportFacility {
    facility: number;
    booked: boolean;
    atc: VatsimShortenedController[];
}

export interface FeatureAirportAirportAtcProperties {
    type: 'airport-atc';
    icao: string;
    iata?: string;
    index: number;
    totalCount: number;
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
    counterType: MapAircraftKeys | 'training';
    localsLength: number;
    id: `airport-${ string }-${ MapAircraftKeys | 'training' }`;
}

export interface FeatureAirportGateProperties {
    type: 'airport-gate' | 'airport-runway';
    identifier: string;
    id: `airport-${ string }-${ string }`;
}

export type FeatureAirport = Feature<Point, FeatureAirportProperties>;
export type FeatureAirportApproach = Feature<Polygon, FeatureAirportApproachProperties>;
export type FeatureAirportApproachLabel = Feature<Point, FeatureAirportApproachTextProperties>;
export type FeatureAirportGate = Feature<Point, FeatureAirportGateProperties>;
export type FeatureAirportAtc = Feature<Point, FeatureAirportAirportAtcProperties>;
export type FeatureAirportCounter = Feature<Point, FeatureAirportAirportCounterProperties>;

export type FeatureSimAware = Feature<Polygon | MultiPolygon, SimAwareProperties & { type: 'simaware' }>;

export type MapFeatures =
    | FeatureAirport
    | FeatureAirportApproach
    | FeatureAirportApproachLabel
    | FeatureAirportGate
    | FeatureAirportAtc
    | FeatureAirportCounter
    | FeatureSimAware;

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
    return source.getFeatureById(id) as FeatureForType<T> | null;
}

export function isMapFeature<T extends MapFeaturesType>(type: T, properties: Record<string, any>): properties is MapFeatureProperties<T> {
    return properties.type === type;
}
