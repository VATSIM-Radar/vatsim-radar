import type { Pixel } from 'ol/pixel';
import type { PartialRecord } from '~/types';
import type { FeatureCollection } from 'geojson';

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
}

export type NavigraphLayoutType = | 'aerodromereferencepoint'
    | 'apronelement'
    | 'arrestinggearlocation'
    | 'asrnedge'
    | 'asrnnode'
    | 'blastpad'
    | 'constructionarea'
    | 'deicingarea'
    | 'finalapproachandtakeoffarea'
    | 'frequencyarea'
    | 'helipadthreshold'
    | 'hotspot'
    | 'landandholdshortoperationlocation'
    | 'paintedcenterline'
    | 'parkingstandarea'
    | 'parkingstandlocation'
    | 'runwaydisplacedarea'
    | 'runwayelement'
    | 'runwayexitline'
    | 'runwayintersection'
    | 'runwaymarking'
    | 'runwayshoulder'
    | 'runwaythreshold'
    | 'serviceroad'
    | 'standguidanceline'
    | 'stopway'
    | 'taxiwayelement'
    | 'taxiwayguidanceline'
    | 'taxiwayholdingposition'
    | 'taxiwayintersectionmarking'
    | 'taxiwayshoulder'
    | 'touchdownliftoffarea'
    | 'verticallinestructure'
    | 'verticalpointstructure'
    | 'verticalpolygonalstructure'
    | 'water';

export type NavigraphLayout = PartialRecord<NavigraphLayoutType, FeatureCollection>;
