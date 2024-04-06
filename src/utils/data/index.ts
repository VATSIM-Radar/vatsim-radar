import { useDataStore } from '~/store/data';

export const useFacilitiesNames = () => {
    const dataStore = useDataStore();

    return {
        OBS: dataStore.vatsim.data?.facilities.find(x => x.short === 'OBS')?.long ?? '',
        FSS: dataStore.vatsim.data?.facilities.find(x => x.short === 'FSS')?.long ?? '',
        DEL: dataStore.vatsim.data?.facilities.find(x => x.short === 'DEL')?.long ?? '',
        GND: dataStore.vatsim.data?.facilities.find(x => x.short === 'GND')?.long ?? '',
        TWR: dataStore.vatsim.data?.facilities.find(x => x.short === 'TWR')?.long ?? '',
        APP: dataStore.vatsim.data?.facilities.find(x => x.short === 'APP')?.long ?? '',
        CTR: dataStore.vatsim.data?.facilities.find(x => x.short === 'CTR')?.long ?? '',
    };
};
