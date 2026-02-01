import { safeRef } from '~/composables';
import type { Coordinate } from 'ol/coordinate';
import type { FeatureAirport, MapFeatures } from '~/utils/map/entities';

export interface RadarEventPayload<T = MapFeatures> { feature: T; coordinate: Coordinate }

export const hoveredAircraft = safeRef<number | null>(null);

// TODO: replace everything with Feature<type>
export async function handleAircraftClick({ feature }: RadarEventPayload<FeatureAirport>) {
    const store = useStore();
    const mapStore = useMapStore();
    const cid: string = feature.getProperties().id.toString();

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
