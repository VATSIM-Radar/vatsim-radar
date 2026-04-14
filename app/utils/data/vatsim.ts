import { radarStorage } from '~/utils/server/storage';

export const useFacilitiesIds = () => {
    return {
        OBS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'OBS')?.id ?? -1,
        FSS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'FSS')?.id ?? -1,
        DEL: radarStorage.vatsim.data?.facilities.find(x => x.short === 'DEL')?.id ?? -1,
        GND: radarStorage.vatsim.data?.facilities.find(x => x.short === 'GND')?.id ?? -1,
        TWR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'TWR')?.id ?? -1,
        APP: radarStorage.vatsim.data?.facilities.find(x => x.short === 'APP')?.id ?? -1,
        CTR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'CTR')?.id ?? -1,
    };
};

const facilitiesMap = {
    OBS: 0,
    FSS: 1,
    DEL: 2,
    GND: 3,
    TWR: 4,
    APP: 5,
    CTR: 6,
};

export function getFacilityByCallsign(callsign: string): number {
    let postfix = callsign.split('_').at(-1);
    if (postfix === 'DEP') postfix = 'APP';
    if (postfix === 'RMP') postfix = 'GND';
    return facilitiesMap[postfix as keyof typeof facilitiesMap] ?? -1;
}
