import { radarStorage } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';

export default cachedEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return radarStorage.vatsim.mandatoryData;
}, {
    name: 'mandatory',
    maxAge: 1,
    staleMaxAge: 2,
});
