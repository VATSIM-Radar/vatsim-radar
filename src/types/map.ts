import type { PartialRecord } from '~/types/index';
import type { VatsimShortenedPrefile } from '~/types/data/vatsim';

export interface MapAirport {
    icao: string;
    iata?: string;
    aircrafts: Partial<{
        groundDep: number[]
        groundArr: number[]
        prefiles: number[]
        departures: number[]
        arrivals: number[]
    }>
}

export type MapAircraft = PartialRecord<keyof Pick<MapAirport['aircrafts'], 'groundDep' | 'groundArr' | 'prefiles'>, VatsimShortenedPrefile[]> & PartialRecord<keyof Pick<MapAirport['aircrafts'], 'departures' | 'arrivals'>, boolean>
