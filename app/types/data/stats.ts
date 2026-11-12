import type { RadarDataAirline } from '~/utils/server/storage';

export interface StatsAirport {
    icao: string;
    departures: number;
    arrivals: number;
    count: number;
}

export type StatsAirline = RadarDataAirline & { count: number };

export interface StatsAircraft {
    aircraft: string;
    count: number;
}

export interface StatsRoute {
    key: string;
    from: string;
    to: string;
    count: number;
}

export interface StatsATC {
    key: string;
    duration: number;
    uptime: number;
}

export interface StatsRange {
    from: Date;
    to: Date;
}
