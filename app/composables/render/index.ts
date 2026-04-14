import type { Coordinate } from 'ol/coordinate.js';
import { globalMapEntities, isMapFeature } from '~/utils/map/entities';

export const FEATURES_Z_INDEX = {
    AIRPORTS: 8,
    AIRPORTS_NAVIGRAPH: 5,
    AIRPORTS_LABELS: 5,
    AIRPORTS_GATES: 6,

    SECTORS: 6,
    SECTORS_LABEL: 9,

    AIRCRAFT: 7,
    AIRCRAFT_LINE: 6.5,
    AIRCRAFT_HEATMAP: 6.3,
};

export function getControllersForPosition(position: Coordinate, excludeCtr = false) {
    const { airports, sectors } = globalMapEntities;

    const features = [
        ...airports?.getFeaturesAtCoordinate(position).map(x => {
            const properties = x.getProperties();
            if (isMapFeature('airport-circle', properties) || isMapFeature('airport-tracon', properties)) {
                return properties.atc;
            }

            return [];
        }).flat() ?? [],
        ...sectors?.getFeaturesAtCoordinate(position).map(x => {
            const properties = x.getProperties();
            if (isMapFeature('sector', properties) || isMapFeature('sector-vatglasses', properties)) {
                return properties.atc;
            }

            return [];
        }).flat() ?? [],
    ];

    const facilities = useFacilitiesIds();

    if (excludeCtr) return features.filter(x => x.facility !== facilities.CTR && x.facility !== facilities.FSS);
    return features;
}
