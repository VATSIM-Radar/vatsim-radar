import { radarStorage } from '~/utils/backend/storage';
import type { FeatureCollection, Feature, LineString } from 'geojson';

export default defineEventHandler(async event => {
    const { procedure, airport } = getRouterParams(event);

    const data = radarStorage.navigraphData.full.current?.approaches[airport]?.filter(x => x.procedure.runway === procedure);
    if (!data) return;

    return {
        type: 'FeatureCollection',
        features: data.flatMap(x => {
            const features: Feature<LineString>[] = [];

            features.push({
                type: 'Feature',
                properties: {
                    stroke: 'blue',
                    name: x.procedure.procedureName,
                    runway: x.procedure.runway,
                },
                geometry: {
                    type: 'LineString',
                    coordinates: x.waypoints.map(x => x.coordinate),
                },
            });

            if (x.procedure.missedApproach.length) {
                features.push({
                    type: 'Feature',
                    properties: {
                        stroke: 'red',
                        name: x.procedure.procedureName,
                        runway: x.procedure.runway,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: x.procedure.missedApproach.map(x => x.coordinate),
                    },
                });
            }

            if (x.transitions.length) {
                features.push(...x.transitions.map(x => ({
                    type: 'Feature',
                    properties: {
                        stroke: 'green',
                        name: x.name,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: x.waypoints.map(x => x.coordinate),
                    },
                } satisfies Feature<LineString>)));
            }

            return features;
        }),
    } satisfies FeatureCollection;
});
