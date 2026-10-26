import type { AirportStand } from '~/types/data/stands';
import type { PartialRecord } from '~/types';
import type { FeatureCollection } from 'geojson';
import type { AmdbLayerName, AmdbResponseStructure } from '@navigraph/amdb';

export type NavigraphStandArea = Pick<AmdbResponseStructure['parkingstandarea']['features'][number]['properties'], 'restacn'>;
export type NavigraphStandGuidanceLine = Pick<AmdbResponseStructure['standguidanceline']['features'][number]['properties'], 'wingspan' | 'status'>;

export interface NavigraphGate extends AirportStand {
    restacn?: NavigraphStandArea['restacn'];
    guidanceLines?: NavigraphStandGuidanceLine[];
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
