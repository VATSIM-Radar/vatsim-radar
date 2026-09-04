import type { AircraftRenderSettings, AircraftRenderState } from '~/composables/render/aircraft';
import type { QuestDBGeojson } from '~/utils/server/questdb/converters';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { greatCircleToOl } from '~/utils';
import { LineString, MultiLineString } from 'ol/geom.js';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { FeatureAircraftLine } from '~/utils/map/entities';
import type { Position } from 'geojson';
import { aircraftState } from './state';

const TURNS_REQUEST_INTERVAL = 1000 * 15;
const TURNS_REQUEST_TIMEOUT = 1000 * 5;

const STRAIGHT_LINE_NPOINTS = 8;

async function updateAircraftRoute(show: boolean | null | undefined, renderSettings: AircraftRenderSettings, { aircraft, pilot, coordinates, overlay, tracksFeatures }: AircraftRenderState) {
    const updateState = aircraftState[aircraft.cid];

    if (!updateState || updateState.settingRoute || !pilot) return;
    updateState.settingRoute = true;

    try {
        const dataStore = useDataStore();
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

        if (!updateState.previousFlightPlan || updateState.previousFlightPlan !== updateState.flightPlan) {
            delete dataStore.navigraphWaypoints.value[stringCid];
            updateState.previousFlightPlan = updateState.flightPlan;
        }

        dataStore.navigraphWaypoints.value[stringCid] = {
            pilot: pilot,
            coordinates,
            full: typeof overlay?.data?.fullRoute === 'boolean' ? overlay?.data?.fullRoute : !!getKeyedValueFromSettings('map.traffic.showFullRoute'),
            calculatedArrival: dataStore.navigraphWaypoints.value[stringCid]?.calculatedArrival,
            disableHoldings: getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.holds') === false && !overlay && !hovered,
            disableWaypoints: getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.waypoints') === false && !overlay && !hovered,
            disableLabels: getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.labels') === false && !overlay && !hovered,
            waypoints: dataStore.navigraphWaypoints.value[stringCid]?.waypoints ?? await getFlightPlanWaypoints({
                flightPlan: updateState.flightPlan!,
                departure: pilot.departure!,
                arrival: pilot.arrival!,
                cid: pilot.cid,
                disableSidParsing: getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.sid') === false,
                disableStarParsing: getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.star') === false,
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

    const updateState = aircraftState[aircraft.cid] ??= {};

    if (updateState.updating) return;

    let depLine: FeatureAircraftLine | undefined, arrLine: FeatureAircraftLine | undefined;

    function clearNonStraightFeatures() {
        const features = tracksFeatures.filter(x => x !== depLine && x !== arrLine);
        if (!features.length) return;

        linesSource?.removeFeatures(features);
        features.forEach(x => x.dispose());
    }

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

    const flightPlanKey = JSON.stringify([
        pilot.callsign,
        pilot.logon_time,
    ]);
    const flightChanged = !!updateState.flightPlanKey && updateState.flightPlanKey !== flightPlanKey;
    updateState.flightPlanKey = flightPlanKey;

    if (flightChanged) {
        tracksFeatures.forEach(feature => {
            linesSource.removeFeature(feature);
            feature.dispose();
        });
        tracksFeatures.splice(0);

        delete dataStore.vatsim.tracksPilotsData.value[aircraft.cid];

        updateState.lastTurnsUpdate = 0;
        updateState.lastTurnsUpdateData = undefined;
        updateState.needsFullTurnsUpdate = true;
        updateState.turnsFirstGroupTimestamp = '';
        updateState.turnsSecondGroupPoint = null;
        updateState.turnsTimestamp = '';
        updateState.turnsStart = '';
        updateState.flightPlan = undefined;
        updateState.previousFlightPlan = undefined;

        const stringCid = aircraft.cid.toString();
        const hadRoute = dataStore.navigraphWaypoints.value[stringCid];
        delete dataStore.navigraphWaypoints.value[stringCid];
        if (hadRoute) triggerRef(dataStore.navigraphWaypoints);
    }

    try {
        updateState.updating = true;
        let turnsColor = getAircraftStatusColor(status, aircraft.cid);
        const turnsTransparency = getKeyedValueFromSettings('map.preferences.colors.turnsTransparency');

        if (turnsTransparency) {
            const rgb = hexToRgb(turnsColor);

            turnsColor = `rgba(${ rgb }, ${ turnsTransparency })`;
        }

        for (const feature of tracksFeatures) {
            const properties = feature.getProperties();

            if (properties.lineType === 'departure-straight' && properties.color === turnsColor) depLine = feature;
            if (properties.lineType === 'arrival-straight' && properties.color === turnsColor) arrLine = feature;
        }

        const departureAirport = pilot.departure ? dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.departure] : null;
        const arrivalAirport = pilot.arrival ? dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.arrival] : null;
        const routeParsingEnabled = getKeyedValueFromSettings('map.navigraph.routeParsing.enabled');
        const routeParsingOnHover = getKeyedValueFromSettings('map.navigraph.routeParsing.enabledOnHover');
        const canShowRoute = arrivalAirport &&
            track.isShown &&
            (pilot?.groundspeed > 50 || !!overlay || hovered) &&
            routeParsingEnabled &&
            (routeParsingOnHover || !hovered) &&
            track.show !== 'short' &&
            !!dataStore.navigraph.version.value;

        if (canShowRoute && !updateState.flightPlan) {
            updateState.flightPlan = (await $fetch<{ flightPlan: string } | null | undefined>(`/api/data/vatsim/pilot/${ aircraft.cid }/plan`, {
                timeout: TURNS_REQUEST_TIMEOUT,
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
            const geometry = greatCircleToOl(coordinates, [arrivalAirport.lon, arrivalAirport.lat]);

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
            // No rendered history means this CID may have reconnected; do not reuse the previous session cache.
            updateState.lastTurnsUpdate = 0;
            updateState.lastTurnsUpdateData = undefined;
            updateState.needsFullTurnsUpdate = true;
        }

        let shortUpdate = !!updateState.turnsFirstGroupTimestamp;

        let turns: QuestDBGeojson | null | undefined;

        if (track.show !== 'short') {
            if (updateState.lastTurnsUpdate && updateState.lastTurnsUpdate > Date.now() - TURNS_REQUEST_INTERVAL && updateState.lastTurnsUpdateData) {
                turns = updateState.lastTurnsUpdateData;
            }
            else {
                const start = updateState.needsFullTurnsUpdate ? '' : updateState.turnsFirstGroupTimestamp ?? '';

                try {
                    turns = await $fetch<QuestDBGeojson | null | undefined>(`/api/data/vatsim/pilot/${ aircraft.cid }/turns?start=${ start }`, {
                        timeout: TURNS_REQUEST_TIMEOUT,
                    });
                }
                catch (error) {
                    console.error(error);
                }

                if (turns) {
                    updateState.lastTurnsUpdateData = turns;
                    updateState.lastTurnsUpdate = Date.now();
                    updateState.needsFullTurnsUpdate = false;
                    if (turns.flightPlanTime) {
                        const previousData = dataStore.vatsim.tracksPilotsData.value[aircraft.cid];
                        // Incremental groups may omit timestamps recorded before the requested cursor.
                        const previousFlightData = start && previousData?.flightPlanTime === turns.flightPlanTime ? previousData : undefined;
                        dataStore.vatsim.tracksPilotsData.value[aircraft.cid] = {
                            flightPlanTime: turns.flightPlanTime,
                            departedAt: turns.departedAt ?? previousFlightData?.departedAt ?? null,
                            arrivedAt: turns.arrivedAt ?? previousFlightData?.arrivedAt ?? null,
                        };
                    }
                }
            }
        }

        if (turns) {
            updateState.flightPlan = turns.flightPlan;
        }

        const firstUpdate = !!(
            updateState.turnsStart &&
            turns?.flightPlanTime &&
            turns.flightPlanTime !== updateState.turnsStart
        );

        // Doing a full update
        if (firstUpdate) {
            tracksFeatures.forEach(feature => {
                linesSource.removeFeature(feature);
                feature.dispose();
            });
            tracksFeatures.splice(0);

            const stringCid = aircraft.cid.toString();
            const hadRoute = dataStore.navigraphWaypoints.value[stringCid];
            delete dataStore.navigraphWaypoints.value[stringCid];
            delete dataStore.vatsim.tracksPilotsData.value[aircraft.cid];
            updateState.previousFlightPlan = undefined;
            if (hadRoute) triggerRef(dataStore.navigraphWaypoints);

            updateState.turnsFirstGroupTimestamp = '';
            updateState.turnsSecondGroupPoint = null;
            updateState.turnsTimestamp = '';
            updateState.turnsStart = turns?.flightPlanTime ?? '';
            updateState.lastTurnsUpdate = 0;
            updateState.lastTurnsUpdateData = undefined;
            updateState.needsFullTurnsUpdate = true;
            shortUpdate = false;
            // This response was requested with the previous flight cursor. Do not render its final
            // group; the next update will replace it with an unfiltered current-flight response.
            turns = undefined;
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
                if (firstUpdate || !turns) return true;
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
                    const geometry = greatCircleToOl(coordinates[0], coordinates[1], { npoints: 8 });

                    const id = `${ aircraft.cid }-timestamp-aircraft` as const;
                    const existing = getMapFeature('aircraft-line', linesSource, id);

                    if (existing) {
                        existing.setGeometry(geometry);
                        existing.setProperties({
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
                    const geometry = greatCircleToOl(coordinates[0], coordinates[1]);

                    const id = `${ aircraft.cid }-timestamp-${ collection.features[0].properties!.timestamp }-departure` as const;
                    const existing = getMapFeature('aircraft-line', linesSource, id);

                    if (existing) {
                        existing.setGeometry(geometry);
                        existing.setProperties({
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

                const newFeatures: LineString[] = [];

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

                    let npoints = 4;

                    if (
                        Math.abs(coords[0][0] - coords[1][0]) > 0.9 ||
                            Math.abs(coords[0][1] - coords[1][1]) > 0.9
                    ) {
                        npoints = 100;
                    }

                    const circle = greatCircleToOl(coords[0], coords[1], {
                        npoints,
                    });

                    newFeatures.push(...(circle instanceof LineString ? [circle] : circle.getLineStrings()));
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
            const hasRenderedHistory = track.show !== 'short' && tracksFeatures.some(feature => {
                const lineType = feature.getProperties().lineType;
                return lineType === 'loaded' || lineType === 'aircraft' || lineType === 'departure-line';
            });

            // A timeout or temporarily empty QuestDB response must not erase a valid route.
            // Short mode explicitly disables loaded history, so it still clears those features.
            if (!hasRenderedHistory) clearNonStraightFeatures();

            if (!hasRenderedHistory && departureAirport && pilot?.depDist && pilot?.depDist > 20 && track.isShown) {
                const geometry = greatCircleToOl([departureAirport.lon, departureAirport.lat], coordinates, { npoints: STRAIGHT_LINE_NPOINTS });

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
            else if (!hasRenderedHistory && depLine) {
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
