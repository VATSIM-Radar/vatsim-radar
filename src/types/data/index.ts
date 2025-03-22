import type { cycles } from '~/utils/backend/navigraph/db';

export interface VatDataVersions {
    vatspy: string;
    vatsim: {
        data: string;
    };
    navigraph: typeof cycles | null;
    simaware: string;
    vatglasses: string;
}
