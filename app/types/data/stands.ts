import type { Pixel } from 'ol/pixel.js';

export interface StandInformationSource {
    id: string;
    kind: 'vacc' | 'aim' | 'aip' | 'import';
    url: string;
    reference: string;
    effectiveDate: string | null;
    accessedAt: string;
}

export interface StandInformation {
    source: 'vatdata-stands';
    effectiveDate: string | null;
    maximumWingspan?: number | null;
    approvedAircraft?: string[] | null;
    prohibitedAircraft: string[] | null;
    notes?: string | null;
    sources?: StandInformationSource[];
    sourceUrl?: string;
    license?: string;
    reviewStatus?: 'reviewed' | 'unreviewed';
    reviewedAt?: string | null;
}

export interface AirportStand {
    gate_identifier: string;
    gate_latitude: number;
    gate_longitude: number;
    name: string;
    airport_identifier: string;
    standInformation?: StandInformation;
    trulyOccupied?: boolean;
    maybeOccupied?: boolean;
    pixel?: Pixel;
}

export interface AirportStandData {
    airport: string;
    gates: AirportStand[];
}
