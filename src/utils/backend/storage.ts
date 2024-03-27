import type { VatSpyData } from '~/server/plugins/vatspy';

export const radarStorage = {
    vatspy: {
        version: '',
        data: null as null | VatSpyData,
    },
};
