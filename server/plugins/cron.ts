import { defineCronJob } from '~/utils/server';
import { initNavigraph } from '~/utils/server/navigraph/db';
import { setupRedisDataFetch } from '~/utils/server/tasks';

export default defineNitroPlugin(async app => {
    setupRedisDataFetch();

    await defineCronJob('45 */2 * * *', initNavigraph);
});
