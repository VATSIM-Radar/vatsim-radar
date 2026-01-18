import type { Feature } from 'ol';
import { safeRef } from '~/composables';

export const hoveredAircraft = safeRef<number | null>(null);

// TODO: replace everything with Feature<type>
export async function handleAircraftClick(aircraft: Feature) {
    const store = useStore();
    const mapStore = useMapStore();
    const cid: string = aircraft.getProperties().id.toString();

    const existingOverlay = mapStore.overlays.find(x => x.key === cid);
    if (existingOverlay) {
        mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot' || x.key !== cid);
        mapStore.sendSelectedPilotToDashboard(null); // an aircraft is deselected, we close the dashboard pilot overlay (for simplicity we close the overlay even when the deselected aircraft is not the one that is currently opened)
        return;
    }

    const overlay = await mapStore.addPilotOverlay(cid);
    if (overlay && store.config.showInfoForPrimaryAirport) {
        overlay.sticky = true;
    }
}
