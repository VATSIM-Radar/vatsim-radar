import type { cycles } from '~/utils/server/navigraph/db';

export interface VatDataVersions {
    vatspy: string;
    vatsim: {
        data: string;
    };
    navigraph: typeof cycles | null;
    simaware: string;
    vatglasses: string;
}
