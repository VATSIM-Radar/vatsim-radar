import { updateVATGlasses } from '~/composables/render/update/vatglasses';
import type { DataAirport } from '~/composables/render/storage';

export interface DataUpdateContext { airports: Record<string, DataAirport> }

export async function updateControllersRender() {
    // TODO: restore state instead of overwrite
    const airports: Record<string, DataAirport> = {};

    // TODO: ADD AIRCRAFT COUNT BEFORE THAT TO CHECK FOR EMPTY AIRPORT INSIDE
    updateVATGlasses({ airports });
}
