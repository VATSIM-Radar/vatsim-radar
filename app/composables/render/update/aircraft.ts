import type { DataUpdateContext } from '~/composables/render/update/index';
import type { VatsimShortenedAircraft, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { MapAircraftKeys } from '~/types/map';

function addAircraftToAirport(context: DataUpdateContext, aircraft: VatsimShortenedAircraft | VatsimShortenedPrefile, icao: string, kind: MapAircraftKeys) {
    const { airports } = context;
    const dataStore = useDataStore();
    const airport = airports[icao];
    if (!airport) {
        const vatAirport = dataStore.vatspy.value?.data.keyAirports.icao[icao];
        if (!vatAirport) return;

        airports[icao] = {
            icao,
            atc: [],
            aircraft: {
                groundDep: [],
                groundArr: [],
                prefiles: [],
                departures: [],
                arrivals: [],
            },
            atis: {},
        };
    }

    airports[icao].aircraft[kind] ??= [];
    airports[icao].aircraft[kind].push(aircraft.cid);
    context.airportsAdded.add(icao);
}

export function updateAircraft(context: DataUpdateContext) {
    const dataStore = useDataStore();

    for (const aircraft of dataStore.vatsim.data.pilots.value) {
        if (aircraft.departure) addAircraftToAirport(context, aircraft, aircraft.departure, aircraft.departure === aircraft.airport ? 'groundDep' : 'departures');
        if (aircraft.arrival) addAircraftToAirport(context, aircraft, aircraft.arrival, aircraft.arrival === aircraft.airport ? 'groundArr' : 'arrivals');

        if (aircraft.airport && aircraft.airport !== aircraft.departure && aircraft.airport !== aircraft.arrival) {
            addAircraftToAirport(context, aircraft, aircraft.airport, 'groundArr');
        }
    }

    for (const prefile of dataStore.vatsim.data.prefiles.value) {
        if (!prefile.departure) continue;
        addAircraftToAirport(context, prefile, prefile.departure, 'prefiles');
    }
}
