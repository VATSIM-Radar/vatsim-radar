import { getBulkAirportIcaos } from '~/utils/server/vatsim/airport-data';
import { getAirportNotams } from '~/utils/server/notams';
import type { VatsimAirportDataNotam } from '~/utils/server/notams';

export default defineEventHandler(async event => {
    const airports = getBulkAirportIcaos(event);
    if (!airports) return;

    const config = useRuntimeConfig();
    const results = await Promise.all(airports.map(async icao => {
        if (!config.FAA_NOTAMS_CLIENT_ID) return [icao, [] as VatsimAirportDataNotam[]] as const;

        try {
            const notams = await getAirportNotams(icao);
            const airportNotams = notams[0]?.scope
                ? notams.filter(notam => !notam.scope || notam.scope.includes('A'))
                : notams;

            return [icao, airportNotams] as const;
        }
        catch (error) {
            console.error(error);
            return [icao, [] as VatsimAirportDataNotam[]] as const;
        }
    }));

    return Object.fromEntries(results);
});
