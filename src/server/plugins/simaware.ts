import { updateSimAware } from '~/utils/backend/vatsim/simaware';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    defineCronJob('15 * * * *', updateSimAware);
});
