import { updateVatSpy } from '~/utils/backend/vatsim/vatspy';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    defineCronJob('15 * * * *', updateVatSpy);
});
