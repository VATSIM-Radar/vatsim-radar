import type { VatDataVersions } from '~/types/data';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { VatsimLiveData } from '~/types/data/vatsim';
import type { Ref } from 'vue';

const versions = ref<null | VatDataVersions>(null);
const vatspy = shallowRef<VatSpyAPIData>();

type Data = {
    [K in keyof VatsimLiveData]: Ref<VatsimLiveData[K] extends Array<any> ? VatsimLiveData[K] : (VatsimLiveData[K] | null)>
}

const data:Data = {
    general: ref(null),
    pilots: shallowRef([]),
    airports: shallowRef([]),
    prefiles: shallowRef([]),
    locals: shallowRef([]),
    firs: shallowRef([]),
    facilities: shallowRef([]),
    military_ratings: shallowRef([]),
    pilot_ratings: shallowRef([]),
    ratings: shallowRef([]),
};

const vatsim = {
    data,
    updateTimestamp: ref(''),
};

export function useDataStore() {
    return {
        versions,
        vatspy,
        vatsim,
    };
}

export function setVatsimDataStore(vatsimData: VatsimLiveData) {
    for (const key in vatsimData) {
        //@ts-ignore
        data[key].value = vatsimData[key];
    }
}
