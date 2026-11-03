import { getStats } from '~/utils/server/stats';

export default defineEventHandler(event => getStats(event, 'routes'));
