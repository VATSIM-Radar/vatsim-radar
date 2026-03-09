import type { AircraftRenderSettings, AircraftRenderState } from '~/composables/render/aircraft/index';
import type { InfluxGeojson } from '~/utils/server/influx/converters';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { point } from '@turf/helpers';
import { turfGeometryToOl } from '~/utils';
import greatCircle from '@turf/great-circle';
import { LineString, MultiLineString } from 'ol/geom.js';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureAircraftLine } from '~/utils/map/entities';
import type { Position } from 'geojson';
import { aircraftState } from './state';

async function updateAircraftRoute(show: boolean | null | undefined, renderSettings: AircraftRenderSettings, { aircraft, pilot, coordinates, overlay, tracksFeatures }: AircraftRenderState) {
    const updateState = aircraftState[aircraft.cid];

    if (!updateState || updateState.settingRoute || !pilot) return;
    updateState.settingRoute = true;

    try {
        const dataStore = useDataStore();
        const store = useStore();
        const hovered = useMapStore().hoveredPilot === aircraft.cid;
        const stringCid = aircraft.cid.toString();

        if (!updateState.flightPlan || !show) {
            const had = dataStore.navigraphWaypoints.value[stringCid];
            delete dataStore.navigraphWaypoints.value[stringCid];
            if (had) {
                triggerRef(dataStore.navigraphWaypoints);
            }

            updateState.settingRoute = false;
            return;
        }

        if (!updateState.previousFlightPlan) updateState.previousFlightPlan = updateState.flightPlan;

        if (updateState.previousFlightPlan !== updateState.flightPlan) {
            delete dataStore.navigraphWaypoints.value[stringCid];
            updateState.previousFlightPlan = updateState.flightPlan;
        }

        dataStore.navigraphWaypoints.value[stringCid] = {
            pilot: pilot,
            coordinates,
            full: typeof overlay?.data?.fullRoute === 'boolean' ? overlay?.data?.fullRoute : !!store.user?.settings.showFullRoute,
            calculatedArrival: dataStore.navigraphWaypoints.value[stringCid]?.calculatedArrival,
            disableHoldings: store.localSettings.navigraphRouteAirportOverlay?.holds === false && !overlay && !hovered,
            disableWaypoints: store.localSettings.navigraphRouteAirportOverlay?.waypoints === false && !overlay && !hovered,
            disableLabels: store.localSettings.navigraphRouteAirportOverlay?.labels === false && !overlay && !hovered,
            waypoints: dataStore.navigraphWaypoints.value[stringCid]?.waypoints ?? await getFlightPlanWaypoints({
                flightPlan: updateState.flightPlan!,
                departure: pilot.departure!,
                arrival: pilot.arrival!,
                cid: pilot.cid,
                disableSidParsing: store.localSettings.navigraphRouteAirportOverlay?.sid === false,
                disableStarParsing: store.localSettings.navigraphRouteAirportOverlay?.star === false,
            }),
        };

        triggerRef(dataStore.navigraphWaypoints);
    }
    finally {
        updateState.settingRoute = false;
    }
}

export async function updateAircraftTracksData(renderSettings: AircraftRenderSettings, renderState: AircraftRenderState) {
    const { linesSource } = renderSettings;
    const { aircraft, pilot, status, tracksFeatures, overlay, coordinates } = renderState;

    let updateState = aircraftState[aircraft.cid];
    if (!updateState) {
        updateState = {};
        aircraftState[aircraft.cid] = updateState;
    }

    if (updateState.updating) return;

    let depLine: FeatureAircraftLine | undefined, arrLine: FeatureAircraftLine | undefined;

    function clearNonStraightFeatures() {
        const features = tracksFeatures.filter(x => x !== depLine && x !== arrLine);
        if (!features.length) return;

        linesSource?.removeFeatures(features);
        features.forEach(x => x.dispose());
    }

    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();
    let track = renderSettings.tracks[aircraft.cid];
    const hovered = mapStore.hoveredPilot === aircraft.cid;

    if (hovered && pilot) {
        track = {
            pilot,
            show: 'full',
            isShown: true,
        };
    }

    if (!pilot || !track) {
        tracksFeatures.forEach(x => {
            linesSource.removeFeature(x);
            x.dispose();
        });

        updateAircraftRoute(false, renderSettings, renderState);

        return;
    }

    try {
        updateState.updating = true;

        for (const feature of tracksFeatures) {
            const properties = feature.getProperties();

            if (properties.lineType === 'departure-straight') depLine = feature;
            if (properties.lineType === 'arrival-straight') arrLine = feature;
        }

        const departureAirport = pilot.departure ? dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.departure] : null;
        const arrivalAirport = pilot.arrival ? dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.arrival] : null;
        const canShowRoute = arrivalAirport &&
            track.isShown &&
            (pilot?.groundspeed > 50 || !!overlay || hovered) &&
            !store.localSettings.disableNavigraphRoute &&
            track.show !== 'short' &&
            !!dataStore.navigraph.data;

        let turnsColor = getAircraftStatusColor(status, aircraft.cid);

        if (store.mapSettings.colors?.turnsTransparency) {
            const rgb = hexToRgb(turnsColor);

            turnsColor = `rgba(${ rgb }, ${ store.mapSettings.colors?.turnsTransparency })`;
        }

        if (canShowRoute && !updateState.flightPlan) {
            updateState.flightPlan = (await $fetch<{ flightPlan: string } | null | undefined>(`/api/data/vatsim/pilot/${ aircraft.cid }/plan`, {
                timeout: 1000 * 5,
            }).catch(console.error))?.flightPlan ?? '';
        }

        updateAircraftRoute(canShowRoute, renderSettings, renderState);

        // Building arrival line
        const straightArrivalLine = !canShowRoute &&
            arrivalAirport &&
            track.isShown && (
            ((calculateDistanceInNauticalMiles([arrivalAirport.lon, arrivalAirport.lat], coordinates)) > 40 && pilot?.groundspeed && pilot.groundspeed > 50) || !!overlay || hovered
        );

        if (straightArrivalLine) {
            const start = point(coordinates);
            const end = point([arrivalAirport.lon, arrivalAirport.lat]);
            const geometry = turfGeometryToOl(greatCircle(start, end));

            if (arrLine) {
                arrLine.setGeometry(geometry);
            }
            else {
                arrLine = createMapFeature('aircraft-line', {
                    geometry,
                    id: `${ aircraft.cid }-arrival`,
                    type: 'aircraft-line',
                    lineType: 'arrival-straight',
                    color: turnsColor,
                    cid: aircraft.cid,
                    status,
                });

                linesSource.addFeature(arrLine);
            }
        }
        else if (arrLine) {
            linesSource.removeFeature(arrLine);
            arrLine.dispose();
        }

        if (!tracksFeatures.length) {
            updateState.turnsFirstGroupTimestamp = '';
            updateState.turnsStart = '';
        }

        const shortUpdate = !!updateState.turnsFirstGroupTimestamp;

        let turns = await new Promise<InfluxGeojson | null | undefined>(async resolve => {
            if (track.show === 'short') {
                resolve(null);
                return;
            }

            // requestIdleCallback was here, just in case

            resolve(
                await $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ aircraft.cid }/turns?start=${ updateState.turnsFirstGroupTimestamp ?? '' }`, {
                    timeout: 1000 * 5,
                }).catch(console.error) ?? null,
            );
        });

        if (turns) {
            updateState.flightPlan = turns.flightPlan;
        }

        const firstUpdate = updateState.turnsStart && turns?.flightPlanTime !== updateState.turnsStart;

        // Doing a full update
        if (firstUpdate) {
            turns = await $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ aircraft.cid }/turns?start=`, {
                timeout: 1000 * 5,
            }).catch(console.error) ?? null;
        }

        if (turns?.features?.[0]?.features.length && turns?.flightPlanTime) {
            updateState.turnsTimestamp = turns.features[0]?.features[0]?.properties!.timestamp ?? '';
            updateState.turnsStart = turns.flightPlanTime;
        }

        if (turns?.features?.length && track.show !== 'short') {
            if (depLine) {
                depLine.dispose();
                linesSource.removeFeature(depLine);
            }

            const firstCollectionTimestamp = turns.features[0].features[turns.features[0].features.length - 1].properties!.timestamp;

            const toRemove = tracksFeatures.filter(x => {
                // Clear all
                if (firstUpdate) return true;
                const { lineType, timestamp } = x.getProperties();

                return x !== arrLine && (lineType === 'aircraft' || timestamp === firstCollectionTimestamp);
            });

            toRemove.forEach(x => {
                linesSource.removeFeature(x);
                x.dispose();
            });

            if (turns.features[1]) {
                updateState.turnsSecondGroupPoint = turns.features[1].features[0];
            }
            else if (updateState.turnsFirstGroupTimestamp !== firstCollectionTimestamp) updateState.turnsSecondGroupPoint = null;

            updateState.turnsFirstGroupTimestamp = firstCollectionTimestamp ?? '';

            for (let i = 0; i < turns.features.length; i++) {
                const collection = {
                    ...turns.features[i],
                };

                collection.features = [...collection.features];

                const nextCollection = turns.features[i + 1];

                if (i === 0) {
                    const coordinates = [
                        collection.features[0].geometry.coordinates.slice(),
                        renderState.coordinates,
                    ];
                    const points = coordinates.map(x => point(x));
                    const geometry = turfGeometryToOl(greatCircle(points[0], points[1], { npoints: 8 }));

                    const id = `${ aircraft.cid }-timestamp-aircraft` as const;
                    const existing = getMapFeature('aircraft-line', linesSource, id);

                    if (existing) {
                        existing.setGeometry(geometry);
                        existing.setProperties({
                            ...existing.getProperties(),
                            timestamp: collection.features[collection.features.length - 1].properties!.timestamp,
                            color: collection.features[0].properties!.color ?? turnsColor,
                        });
                    }
                    else {
                        const lineFeature = createMapFeature('aircraft-line', {
                            geometry,
                            timestamp: collection.features[0].properties!.timestamp,
                            color: collection.features[0].properties!.color ?? turnsColor,
                            type: 'aircraft-line',
                            lineType: 'aircraft',
                            id,
                            cid: aircraft.cid,
                            status,
                        });

                        linesSource.addFeature(lineFeature);
                    }
                }

                if (nextCollection) {
                    collection.features.push({
                        type: 'Feature',
                        properties: {
                            type: 'turn',
                            color: collection.features[0].properties!.color,
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: nextCollection.features[0].geometry.coordinates.slice(),
                        },
                    });
                }
                else if (shortUpdate && i === 0 && updateState.turnsSecondGroupPoint) {
                    collection.features.push({
                        type: 'Feature',
                        properties: {
                            type: 'turn',
                            color: updateState.turnsSecondGroupPoint.properties!.color,
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: updateState.turnsSecondGroupPoint.geometry.coordinates.slice(),
                        },
                    });
                }

                if (i === turns.features.length - 1 &&
                    !shortUpdate &&
                    departureAirport &&
                    arrivalAirport &&
                    departureAirport.icao !== arrivalAirport?.icao &&
                    !turns.features.some(x => x.features.some(x => x.properties!.standing === true))
                ) {
                    const coordinates = [
                        [departureAirport.lon, departureAirport.lat],
                        collection.features[collection.features.length - 1].geometry.coordinates.slice(),
                    ];
                    const points = coordinates.map(x => point(x));
                    const geometry = turfGeometryToOl(greatCircle(points[0], points[1]));

                    const id = `${ aircraft.cid }-timestamp-${ collection.features[0].properties!.timestamp }-departure` as const;
                    const existing = getMapFeature('aircraft-line', linesSource, id);

                    if (existing) {
                        existing.setGeometry(geometry);
                        existing.setProperties({
                            ...existing.getProperties(),
                            timestamp: collection.features[0].properties!.timestamp,
                            color: collection.features[0].properties!.color ?? turnsColor,
                        });
                    }
                    else {
                        const lineFeature = createMapFeature('aircraft-line', {
                            geometry,
                            timestamp: collection.features[0].properties!.timestamp,
                            color: collection.features[0].properties!.color ?? turnsColor,
                            type: 'aircraft-line',
                            lineType: 'departure-line',
                            id,
                            cid: aircraft.cid,
                            status,
                        });

                        linesSource.addFeature(lineFeature);
                    }
                }

                const id = `${ aircraft.cid }-timestamp-${ collection.features[0].properties!.timestamp }` as const;

                const newFeatures: Array<LineString | Position[]> = [];

                function addFeature(geometry: Position | Position[]) {
                    if (typeof geometry[0] === 'number') {
                        if (newFeatures.length) {
                            const lineString = newFeatures.at(-1);
                            if (lineString instanceof LineString) {
                                lineString.appendCoordinate(geometry as Position);
                            }
                        }

                        const lineString = new LineString([geometry as Position]);
                        newFeatures.push(lineString);
                    }
                    else newFeatures.push(new LineString(geometry as Position[]));
                }

                for (let i = 0; i < collection.features.length; i++) {
                    const curPoint = collection.features[i];
                    const nextPoint = collection.features[i + 1];
                    if (!nextPoint) {
                        addFeature(curPoint.geometry.coordinates);
                        continue;
                    }

                    if (curPoint.geometry.coordinates[0] === nextPoint.geometry.coordinates[0] && curPoint.geometry.coordinates[1] === nextPoint.geometry.coordinates[1]) {
                        addFeature(curPoint.geometry.coordinates);
                        addFeature(nextPoint.geometry.coordinates);
                        continue;
                    }

                    const coords = [curPoint.geometry.coordinates, nextPoint.geometry.coordinates];

                    const points = coords.map(x => point(x));

                    let npoints = 4;

                    if (
                        Math.abs(coords[0][0] - coords[1][0]) > 0.9 ||
                            Math.abs(coords[0][1] - coords[1][1]) > 0.9
                    ) {
                        npoints = 100;
                    }

                    const circle = greatCircle(points[0], points[1], {
                        npoints,
                    });

                    circle.geometry.coordinates.map(x => addFeature(x));
                }

                const lineFeature = createMapFeature('aircraft-line', {
                    geometry: new MultiLineString(newFeatures),
                    timestamp: i === 0 ? updateState.turnsFirstGroupTimestamp : undefined,
                    color: collection.features[0].properties!.color ?? turnsColor,
                    type: 'aircraft-line',
                    lineType: 'loaded',
                    id,
                    cid: aircraft.cid,
                    status,
                });

                linesSource.addFeature(lineFeature);
            }
        }
        else {
            clearNonStraightFeatures();

            if (departureAirport && pilot?.depDist && pilot?.depDist > 20 && track.isShown) {
                const start = point([departureAirport.lon, departureAirport.lat]);
                const end = point(coordinates);

                const geometry = turfGeometryToOl(greatCircle(start, end));

                if (depLine) {
                    depLine.setGeometry(geometry);
                }
                else {
                    depLine = createMapFeature('aircraft-line', {
                        geometry,
                        id: `${ aircraft.cid }-departure`,
                        type: 'aircraft-line',
                        lineType: 'departure-straight',
                        color: turnsColor,
                        cid: aircraft.cid,
                        status,
                    });

                    linesSource.addFeature(depLine);
                }
            }
            else if (depLine) {
                depLine.dispose();
                linesSource.removeFeature(depLine);
            }
        }
    }
    catch (e) {
        useRadarError(e);
    }
    finally {
        updateState.updating = false;
    }
}
