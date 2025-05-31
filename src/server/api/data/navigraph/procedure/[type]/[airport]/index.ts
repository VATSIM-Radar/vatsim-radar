import { getNavDataProcedure } from '~/utils/backend/navigraph/navdata';

export default defineEventHandler(async event => {
    return getNavDataProcedure(event, 'all');
});
