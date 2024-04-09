export interface MapAirport {
    icao: string;
    elevation: number;
    lon: number;
    lat: number;
    name: string;
    aircrafts: Partial<{
        groundDep: number[]
        groundArr: number[]
        prefiles: number[]
        departures: number[]
        arrivals: number[]
    }>
}
