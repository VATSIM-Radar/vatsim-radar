import { updateVATGlasses } from '~/composables/render/update/vatglasses';
import type { DataAirport } from '~/composables/render/storage';

export async function updateControllersRender() {
    const airports: Record<string, DataAirport> = {};

    // ADD AIRCRAFT COUNT BEFORE THAT TO CHECK FOR EMPTY AIRPORT INSIDE
    updateVATGlasses({ airports });
}
