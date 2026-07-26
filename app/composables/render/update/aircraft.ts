import type { DataUpdateContext } from '~/composables/render/update/index';
import type { VatsimShortenedAircraft, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { MapAircraftKeys } from '~/types/map';

function addAircraftToAirport(context: DataUpdateContext, aircraft: VatsimShortenedAircraft | VatsimShortenedPrefile, icao: string, kind: MapAircraftKeys) {
    const { airports } = context;
    const dataStore = useDataStore();
    const vatAirport = dataStore.vatspy.value?.data.keyAirports.realIcao[icao] ?? dataStore.vatspy.value?.data.keyAirports.realIata[icao];
    if (vatAirport) icao = vatAirport.icao;

    const airport = airports[icao];
    if (!airport) {
        if (!vatAirport) return;

        airports[icao] = {
            icao,
            airport: vatAirport,
            atc: [],
            aircraft: {
                groundDep: [],
                groundArr: [],
                prefiles: [],
                departures: [],
                arrivals: [],
            },
            aircraftCount: 0,
            atis: {},
        };
    }

    if (airports[icao]) {
        airports[icao].aircraft[kind] ??= [];
        airports[icao].aircraft[kind]?.push(aircraft.cid);
        airports[icao].aircraftCount++;
        context.airportsAdded.add(icao);
    }
}

export function updateAircraft(context: DataUpdateContext) {
    const dataStore = useDataStore();

    for (const aircraft of dataStore.vatsim.data.pilots.value) {
        if (aircraft.status === 'depTaxi' && aircraft.airport) addAircraftToAirport(context, aircraft, aircraft.airport, 'groundDep');
        else if (aircraft.departure) addAircraftToAirport(context, aircraft, aircraft.departure, 'departures');

        if (aircraft.status === 'arrTaxi' && (aircraft.airport || aircraft.arrival)) {
            addAircraftToAirport(context, aircraft, aircraft.airport ?? aircraft.arrival!, 'groundArr');
        }
        else if (aircraft.arrival) addAircraftToAirport(context, aircraft, aircraft.arrival, 'arrivals');
    }

    for (const prefile of dataStore.vatsim.data.prefiles.value) {
        if (!prefile.departure) continue;
        addAircraftToAirport(context, prefile, prefile.departure, 'prefiles');
    }
}
