import { Feature } from 'ol';
import type { Point } from 'ol/geom.js';
import type Polygon from 'ol/geom/Polygon.js';
import type MultiPolygon from 'ol/geom/MultiPolygon.js';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type VectorSource from 'ol/source/Vector';
import type { SimAwareProperties } from '~/utils/server/storage';

export interface FeatureAirportProperties {
    type: 'airport';
    icao: string;
    iata: string;
    name: string;
    id: string;
}

export interface FeatureAirportApproachProperties {
    type: 'airport-circle' | 'airport-tracon';
    icao: string;
    iata: string;
    id: string;
}

export interface FeatureAirportApproachTextProperties {
    type: 'airport-circle-label' | 'airport-tracon-label';
    icao: string;
    iata: string;
    id: string;
    traconId?: string;
}

export interface FeatureAirportGateProperties {
    type: 'airport-gate' | 'airport-runway';
    identifier: string;
    id: string;
}

export type FeatureAirport = Feature<Point, FeatureAirportProperties>;
export type FeatureAirportApproach = Feature<Polygon, FeatureAirportApproachProperties>;
export type FeatureAirportApproachLabel = Feature<Point, FeatureAirportApproachTextProperties>;
export type FeatureAirportGate = Feature<Point, FeatureAirportGateProperties>;

export type FeatureSimAware = Feature<Polygon | MultiPolygon, SimAwareProperties & { type: 'simaware' }>;

export type MapFeatures =
    | FeatureAirport
    | FeatureAirportApproach
    | FeatureAirportApproachLabel
    | FeatureAirportGate
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
    if ('id' in settings) feature.setId(`${ type }-${ settings.id }`);
    return feature as FeatureForType<T>;
}

export function getMapFeature<T extends MapFeaturesType>(
    type: T,
    source: VectorSource,
    id: MapFeatureProperties<T>['id'],
): FeatureForType<T> | null {
    return source.getFeatureById(`${ type }-${ id }`) as FeatureForType<T> | null;
}

export function isMapFeature<T extends MapFeaturesType>(type: T, properties: Record<string, any>): properties is MapFeatureProperties<T> {
    return properties.id === type;
}
