import { fromServerLonLat, getTransceiverData } from '~/utils/backend/vatsim/index';
import { useFacilitiesIds } from '~/utils/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';
import { wss } from '~/utils/backend/vatsim/ws';

export function updateVatsimDataStorage() {
    const data = radarStorage.vatsim.data!;

    data.pilots = data.pilots.map(x => {
        const coords = fromServerLonLat([x.longitude, x.latitude]);
        const transceiver = getTransceiverData(x.callsign);

        return {
            ...x,
            longitude: coords[0],
            latitude: coords[1],
            frequencies: transceiver.frequencies,
        };
    }).filter((x, index) => !data.pilots.some((y, yIndex) => y.cid === x.cid && yIndex < index));

    data.general.supsCount = data.controllers.filter(x => x.rating === 11 && x.frequency === '199.998').length;
    data.general.admCount = data.controllers.filter(x => x.rating === 12 && x.frequency === '199.998').length;
    data.general.onlineWSUsers = wss.clients.size;

    data.prefiles = data.prefiles.filter((x, index) => !data.pilots.some(y => x.cid === y.cid) && !data.prefiles.some((y, yIndex) => y.cid === x.cid && yIndex > index));

    const positions = useFacilitiesIds();

    data.controllers = data.controllers.filter(controller => {
        if (controller.facility === positions.OBS) return;
        let postfix = controller.callsign.split('_').slice(-1)[0];
        if (postfix === 'DEP') postfix = 'APP';
        controller.facility = positions[postfix as keyof typeof positions] ?? -1;
        return controller.facility !== -1 && controller.facility !== positions.OBS;
    });
}
