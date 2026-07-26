import { getNavDataProcedure } from '~/utils/server/navigraph/navdata';

export default defineEventHandler(async event => {
    return getNavDataProcedure(event, 'short');
});
