interface Callsign {
    icao: string;
    airline: string;
    callsign: string;
    country: string;
}

export interface Callsigns {
    records: string;
    page: string;
    total: string;
    rows: Callsign[];
}
