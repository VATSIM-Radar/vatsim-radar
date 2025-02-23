import { defineCronJob } from '~/utils/backend';
import { initNavigraph } from '~/utils/backend/navigraph-db';
import { updateSimAware } from '~/utils/backend/vatsim/simaware';
import { updateVatglassesData } from '~/utils/backend/vatglasses';
import { updateVatSpy } from '~/utils/backend/vatsim/vatspy';
import { updateAirlines } from '~/utils/backend/vatsim/update';

export default defineNitroPlugin(app => {
    defineCronJob('15 */2 * * *', initNavigraph);
    defineCronJob('15 * * * *', updateSimAware);
    defineCronJob('15 */2 * * *', updateVatglassesData);
    defineCronJob('15 * * * *', updateVatSpy);
    defineCronJob('15 */2 * * *', initNavigraph);
    defineCronJob('15 0 * * *', updateAirlines);
});
