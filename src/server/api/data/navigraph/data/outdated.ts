import { getShortNavData } from '~/utils/backend/navigraph/navdata';

export default defineEventHandler(async event => {
    return getShortNavData(event, 'outdated');
});
