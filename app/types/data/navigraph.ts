import type { Pixel } from 'ol/pixel.js';
import type { PartialRecord } from '~/types';
import type { FeatureCollection } from 'geojson';
import type { AmdbLayerName, AmdbResponseStructure } from '@navigraph/amdb';

export type NavigraphStandArea = Pick<AmdbResponseStructure['parkingstandarea']['features'][number]['properties'], 'restacn'>;
export type NavigraphStandGuidanceLine = Pick<AmdbResponseStructure['standguidanceline']['features'][number]['properties'], 'wingspan' | 'status'>;

export interface NavigraphGate {
    gate_identifier: string;
    gate_latitude: number;
    gate_longitude: number;
    name: string;
    airport_identifier: string;
    // Raw AMDB stand fields, parsed on frontend (see utils/shared/stands.ts)
    restacn?: NavigraphStandArea['restacn'];
    guidanceLines?: NavigraphStandGuidanceLine[];
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
