export interface MapAirport {
    icao: string;
    aircrafts: Partial<{
        groundDep: number[]
        groundArr: number[]
        prefiles: number[]
        departures: number[]
        arrivals: number[]
    }>
}
