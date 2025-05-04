import { radarStorage } from '~/utils/backend/storage';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export default defineEventHandler(async event => {
    const { airport, procedure } = getRouterParams(event);

    const data = radarStorage.navigraphData.full.current?.stars[airport]?.filter(x => x.procedure.runways?.includes(procedure));
    if (!data) return;

    return {
        type: 'FeatureCollection',
        features: data.flatMap(data => ([
            ...data.transitions.runway.map(x => ({
                type: 'Feature',
                properties: {
                    stroke: 'green',
                    name: x.name,
                },
                geometry: {
                    type: 'LineString',
                    coordinates: x.waypoints.map(x => x.coordinate),
                },
            } satisfies Feature<LineString>)),
            {
                type: 'Feature',
                properties: {
                    stroke: 'blue',
                    name: data.procedure.identifier,
                },
                geometry: {
                    type: 'LineString',
                    coordinates: data.waypoints.map(x => x.coordinate),
                },
            } satisfies Feature<LineString>,
            ...data.transitions.enroute.map(x => ({
                type: 'Feature',
                properties: {
                    stroke: 'red',
                    name: x.name,
                },
                geometry: {
                    type: 'LineString',
                    coordinates: x.waypoints.map(x => x.coordinate),
                },
            } satisfies Feature<LineString>)),
        ])),
    } satisfies FeatureCollection;
});
