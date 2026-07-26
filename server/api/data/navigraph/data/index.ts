import { getShortNavData } from '~/utils/server/navigraph/navdata';

export default defineEventHandler(async event => {
    return getShortNavData(event, 'current');
});
