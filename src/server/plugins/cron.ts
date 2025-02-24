import { defineCronJob } from '~/utils/backend';
import { initNavigraph } from '~/utils/backend/navigraph-db';
import { setupRedisDataFetch } from '~/utils/backend/tasks';

export default defineNitroPlugin(app => {
    setupRedisDataFetch();

    defineCronJob('15 */2 * * *', initNavigraph);
});
