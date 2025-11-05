import { handleH3Exception } from '~/utils/backend/h3';
import { validateAirportIcao } from '~/utils/backend/vatsim';
import type { VatsimAirportDataNotam } from '~/utils/backend/notams';
import { getAirportNotams } from '~/utils/backend/notams';


export default defineEventHandler(async (event): Promise<VatsimAirportDataNotam[] | undefined> => {
    const config = useRuntimeConfig();
    if (!config.FAA_NOTAMS_CLIENT_ID) return;

    const icao = await validateAirportIcao(event);
    if (!icao) return;

    try {
        const notams = await getAirportNotams(icao);

        // Unless this is a FIR request, full filter is not needed
        if (!notams[0]?.scope) return notams;
        return notams.filter(x => !x.scope || x.scope.includes('A'));
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
