import type { Coordinate } from 'ol/coordinate.js';
import { LineString, MultiLineString } from 'ol/geom.js';
import type { FeatureAircraftLine } from '~/utils/map/entities';
import { greatCircleToOl } from '~/utils';

export function setAircraftLineEndpoints(feature: FeatureAircraftLine, from: Coordinate, to: Coordinate) {
    const geometry = feature.getGeometry();
    if (geometry instanceof LineString || geometry instanceof MultiLineString) {
        const first = geometry.getFirstCoordinate();
        const last = geometry.getLastCoordinate();
        if (first[0] === from[0] && first[1] === from[1] && last[0] === to[0] && last[1] === to[1]) return;
    }
    feature.setGeometry(greatCircleToOl(from, to, { npoints: 8 }));
}

// Only live connectors change between feed snapshots. Keep the antimeridian-aware
// construction shared with mandatory updates, and avoid replacing unchanged geometry.
export function updateAircraftLineCoordinates(features: Iterable<FeatureAircraftLine>, coordinate: Coordinate) {
    for (const feature of features) {
        const kind = feature.get('lineType');
        if (kind !== 'arrival-straight' && kind !== 'departure-straight' && kind !== 'aircraft') continue;
        const geometry = feature.getGeometry();
        if (!(geometry instanceof LineString) && !(geometry instanceof MultiLineString)) continue;
        const first = geometry.getFirstCoordinate();
        const last = geometry.getLastCoordinate();
        const moving = kind === 'arrival-straight' ? first : last;
        if (moving[0] === coordinate[0] && moving[1] === coordinate[1]) continue;
        setAircraftLineEndpoints(feature,
            kind === 'arrival-straight' ? coordinate : first,
            kind === 'arrival-straight' ? last : coordinate,
        );
    }
}
