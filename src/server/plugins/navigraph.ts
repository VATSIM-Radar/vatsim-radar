import {
    initNavigraph,
} from '~/utils/backend/navigraph-db';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    defineCronJob('15 */2 * * *', () => initNavigraph(true));
});
