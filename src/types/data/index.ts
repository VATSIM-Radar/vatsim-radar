import type { cycles } from '~/server/plugins/navigraph';

export interface VatDataVersions {
    vatspy: string
    vatsim: {
        data: string
    }
    navigraph: typeof cycles | null
}
