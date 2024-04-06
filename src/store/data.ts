import { defineStore } from 'pinia';
import type { VatsimLiveData } from '~/types/data/vatsim';
import type { VatDataVersions } from '~/types/data';
import type { VatSpyAPIData } from '~/types/data/vatspy';

export const useDataStore = defineStore('data', {
    state: () => ({
        versions: null as null | VatDataVersions,
        vatspy: null as null | VatSpyAPIData,
        vatsim: {
            data: null as VatsimLiveData | null,
        },
    }),
});
