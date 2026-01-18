import { handleH3Exception } from '~/utils/server/h3';
import { validateAirportIcao } from '~/utils/server/vatsim';
import { radarStorage } from '~/utils/server/storage';

export default defineEventHandler(async event => {
    const icao = await validateAirportIcao(event);
    if (!icao) return;

    const dataAirport = radarStorage.vatsim.airports.find(x => x.icao === icao);
    if (!dataAirport) return {};

    try {
        return {
            ...Object.fromEntries(Object.entries(dataAirport.aircraft).map(([key, value]) => [key, value.length])),
            totalArrivals: (dataAirport.aircraft.arrivals?.length ?? 0) + (dataAirport.aircraft.groundArr?.length ?? 0),
            totalDepartures: (dataAirport.aircraft.departures?.length ?? 0) + (dataAirport.aircraft.groundDep?.length ?? 0),
        };
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
