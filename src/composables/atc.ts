import { useDataStore } from '~/store/data';
import type { VatSpyDataFeature } from '~/types/data/vatspy';

export const useFacilitiesIds = () => computed(() => {
    const dataStore = useDataStore();

    return {
        OBS: dataStore.vatsim.data?.facilities.find(x => x.short === 'OBS')?.id ?? -1,
        FSS: dataStore.vatsim.data?.facilities.find(x => x.short === 'FSS')?.id ?? -1,
        DEL: dataStore.vatsim.data?.facilities.find(x => x.short === 'DEL')?.id ?? -1,
        GND: dataStore.vatsim.data?.facilities.find(x => x.short === 'GND')?.id ?? -1,
        TWR: dataStore.vatsim.data?.facilities.find(x => x.short === 'TWR')?.id ?? -1,
        APP: dataStore.vatsim.data?.facilities.find(x => x.short === 'APP')?.id ?? -1,
        CTR: dataStore.vatsim.data?.facilities.find(x => x.short === 'CTR')?.id ?? -1,
    };
});

export const useFacilitiesNames = () => computed(() => {
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
});

function findFacility(name: string) {
    const dataStore = useDataStore();
    return dataStore.vatspy?.data.firs.find(x => x.name === name || x.callsign === name || x.boundary === name);
}

function findUir(name: string): VatSpyDataFeature | undefined {
    const dataStore = useDataStore();
    const uir = dataStore.vatspy?.data.uirs.find(x => x.name === name);

    if (!uir) return;

    const firs = uir.firs.split(',');
    const uirFeatures = dataStore.vatspy?.data.firs.filter(x => firs.includes(x.name) || firs.includes(x.callsign ?? '') || firs.includes(x.boundary ?? ''));
    if (!uirFeatures?.length) return;

    return {
        ...uir,
        firs: uirFeatures,
    };
}

export const useATCBounds = () => computed<VatSpyDataFeature[]>(() => {
    const dataStore = useDataStore();
    const facilities = useFacilitiesIds().value;
    const atcWithBounds = dataStore.vatsim.data?.controllers.filter(x => x.facility === facilities.CTR || x.facility === facilities.FSS) ?? [];

    return atcWithBounds.flatMap((atc) => {
        let splittedName = atc.callsign.toUpperCase().split('_');
        splittedName = splittedName.slice(0, splittedName.length - 1);

        const regularName = splittedName.join('_');
        const firstName = splittedName.slice(0, 1).join('_');

        if (atc.facility === facilities.FSS) {
            let uir = findUir(regularName);
            if (!uir) uir = findUir(firstName);
            if (uir) return uir;
        }

        let feature = findFacility(regularName);
        if (!feature) feature = findFacility(firstName);

        if (!feature) {
            let uir = findUir(regularName);
            if (!uir) uir = findUir(firstName);
            if (uir) return uir;
            else return [];
        }

        return {
            firs: [feature],
        };
    });
});
