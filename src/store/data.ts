import { defineStore } from 'pinia';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { VatsimData } from '~/types/data/vatsim';
import type { VatDataVersions } from '~/types/data';

export const useDataStore = defineStore('data', {
    state: () => ({
        versions: null as null | VatDataVersions,
        vatspy: null as null | VatSpyAPIData,
        vatsim: {
            data: null as VatsimData | null,
        },
    }),
});
