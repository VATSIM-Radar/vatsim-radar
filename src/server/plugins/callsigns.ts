import { defineCronJob } from '~/utils/backend';
import type { Callsigns } from '~/types/data/callsigns';
import { radarStorage } from '~/utils/backend/storage';

export default defineNitroPlugin(app => {
    defineCronJob('* * 12 * *', async () => {
        const fetchedNumberOfCallsigns = await $fetch<Callsigns>('https://gng.aero-nav.com/AERONAV/icao_airlines?action=get&rows=0');
        const fetchedNumberOfVirtualCallsigns = await $fetch<Callsigns>('https://gng.aero-nav.com/AERONAV/icao_fhairlines?action=get&rows=0');
        const fetchedCallsigns = await $fetch<Callsigns>(`https://gng.aero-nav.com/AERONAV/icao_airlines?action=get&rows=${ fetchedNumberOfCallsigns }`);
        const fetchedVirtualCallsigns = await $fetch<Callsigns>(`https://gng.aero-nav.com/AERONAV/icao_fhairlines?action=get&rows=${ fetchedNumberOfVirtualCallsigns }`);
        radarStorage.callsigns = [...fetchedCallsigns.rows, ...fetchedVirtualCallsigns.rows].map(c => ({
            icao: c.icao,
            name: c.airline,
            callsign: c.callsign,
            country: c.country,
        }));
    });
});
