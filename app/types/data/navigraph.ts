import type { Pixel } from 'ol/pixel.js';
import type { PartialRecord } from '~/types';
import type { FeatureCollection } from 'geojson';
import type { AmdbLayerName } from '@navigraph/amdb';

export interface NavigraphGate {
    gate_identifier: string;
    gate_latitude: number;
    gate_longitude: number;
    name: string;
    airport_identifier: string;
    trulyOccupied?: boolean;
    maybeOccupied?: boolean;
    pixel?: Pixel;
}

export interface NavigraphRunway {
    runway_identifier: string;
    runway_latitude: number;
    runway_longitude: number;
    landing_threshold_elevation: number;
    runway_length: number;
    runway_width: number;
    runway_magnetic_bearing: number;
    runway_true_bearing: number;
}

export interface NavigraphAirportData {
    airport: string;
    gates: NavigraphGate[];
    runways: NavigraphRunway[];
    layout?: NavigraphLayout;
}

export type NavigraphLayout = PartialRecord<AmdbLayerName, FeatureCollection>;
