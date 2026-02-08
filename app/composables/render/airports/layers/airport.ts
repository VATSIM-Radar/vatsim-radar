import type VectorSource from 'ol/source/Vector.js';
import type { AirportListItem } from '~/composables/render/airports';
import { getCurrentThemeRgbColor } from '~/composables';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import { Point } from 'ol/geom.js';
import type VectorLayer from 'ol/layer/Vector.js';
import { createDefaultStyle } from 'ol/style/Style.js';
import { createCircle } from '~/utils';
import {
    sortControllersByPosition,
} from '~/composables/vatsim/controllers';
import type { VatsimBooking, VatsimShortenedController } from '~/types/data/vatsim';
import type { MapAircraftKeys } from '~/types/map';
import { getAirportCounters } from '~/composables/vatsim/airport';
import { setAirportStyle } from '~/composables/render/airports/layers/airport-style';

function colorForAirport(airport: AirportListItem) {
    const store = useStore();
    const mapStore = useMapStore();
    const opacity = store.mapSettings.colors?.[store.getCurrentTheme]?.defaultAirport;
    const hasOverlay = mapStore.overlays.some(x => x.type === 'pilot' && (x.data.pilot.airport === airport.airport.icao || x.data.pilot.flight_plan?.departure === airport.airport.icao || x.data.pilot.flight_plan?.arrival === airport.airport.icao));

    if (!hasOverlay) {
        if (!airport.localAtc?.length) return `rgba(${ getCurrentThemeRgbColor('lightGray800').join(',') }, ${ opacity ?? 0.6 })`;
        return `rgba(${ getCurrentThemeRgbColor('lightGray200').join(',') }, ${ opacity ?? 0.8 })`;
    }

    if (!airport.localAtc?.length) return `rgba(${ radarColors.orange500Rgb.join(',') }, ${ opacity ?? 0.8 })`;
    return `rgba(${ radarColors.orange500Rgb.join(',') }, ${ opacity ?? 0.9 })`;
}

interface Facility {
    facility: number;
    booked: boolean;
    atc: VatsimShortenedController[];
}

function createFacility(facilityId: number, booking: VatsimBooking | undefined): Facility {
    return {
        facility: facilityId,
        booked: !!booking,
        atc: [],
    };
}

export function setMapAirports({ source, airports, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
}) {
    const store = useStore();
    const mapStore = useMapStore();

    if (layer.getStyle() === createDefaultStyle) setAirportStyle(layer);

    const map: Record<string, AirportListItem> = {};

    for (const airport of airports) {
        map[airport.airport.icao] = airport;
        const existingFeature = getMapFeature('airport', source, `airport-${ airport.airport.icao }`);
        if (existingFeature) {
            const color = colorForAirport(airport);
            const properties = existingFeature.getProperties();

            existingFeature.setProperties({
                ...properties,
                color,
                aircraftList: airport.aircraftList,
                atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                atc: sortControllersByPosition([
                    ...airport.localAtc,
                    ...airport.arrAtc,
                ]),
            });
        }
        else {
            source.addFeature(createMapFeature('airport', {
                geometry: new Point([airport.airport.lon, airport.airport.lat + (airport.airport.isIata ? 0.8 : 0)]),
                type: 'airport',
                id: `airport-${ airport.airport.icao }`,
                icao: airport.airport.icao,
                iata: airport.airport.iata,
                name: airport.airport.name,
                isPseudo: airport.airport.isPseudo,
                lon: airport.airport.lon,
                lat: airport.airport.lat,
                atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                aircraftList: airport.aircraftList,
                color: colorForAirport(airport),
                atc: sortControllersByPosition([
                    ...airport.localAtc,
                    ...airport.arrAtc,
                ]),
            }));
        }

        let isTWR = airport.arrAtc.every(x => x.isTWR);
        let isDuplicated = airport.arrAtc.every(x => x.duplicated);
        let isBooked = airport.arrAtc.every(x => x.isBooking);

        // Locals
        const facilitiesMap = new Map<number, Facility>();

        airport.localAtc.forEach(local => {
            const facilityId = local.isATIS ? -1 : local.facility;
            let facility = facilitiesMap.get(facilityId);

            if (local.isATIS && store.mapSettings.hideATISOnly && !airport.localAtc.some(x => !x.isATIS)) {
                let existingFacility = getMapFeature('airport-atc', source, `airport-${ airport.airport.icao }--1`);

                if (existingFacility) {
                    source.removeFeature(existingFacility);
                    existingFacility.dispose();
                    existingFacility = null;
                }

                return;
            }

            if (!facility) {
                const booking = airport.bookings.find(x => facilityId === (x.atc.isATIS ? -1 : x.atc.facility));

                local.booking = booking;

                facility = createFacility(facilityId, booking);
                facilitiesMap.set(facilityId, facility);
            }

            facility.atc.push(local);
        });

        const facilities = sortControllersByPosition(Array.from(facilitiesMap.values()));

        facilities.forEach((facility, index) => {
            const key = `airport-${ airport.airport.icao }-${ facility.facility }` as const;
            let existingFacility = getMapFeature('airport-atc', source, key);

            if (existingFacility && facility.booked !== existingFacility?.getProperties().facility.booked) {
                source.removeFeature(existingFacility);
                existingFacility.dispose();
                existingFacility = null;
            }

            if (existingFacility) {
                existingFacility.setProperties({
                    ...existingFacility.getProperties(),
                    facility,
                    index,
                    totalCount: facilities.length,
                });
            }
            else {
                const feature = createMapFeature('airport-atc', {
                    geometry: new Point([airport.airport.lon, airport.airport.lat]),
                    id: key,
                    facility,
                    icao: airport.airport.icao,
                    iata: airport.airport.iata,
                    type: 'airport-atc',
                    index,
                    totalCount: facilities.length,
                });
                source.addFeature(feature);
            }
        });

        // Counters
        if (airport.aircraftList && mapStore.renderedAirports.includes(airport.airport.icao)) {
            const counters = getAirportCounters(airport.aircraft);
            const list = Object.entries(counters);
            const totalCount = list.filter(x => x[1].length).length;
            const localsLength = facilities.length;

            list.filter(x => !x[1].length).forEach(([_key, value]) => {
                const key = _key as MapAircraftKeys;
                const existingCounter = getMapFeature('airport-counter', source, `airport-${ airport.airport.icao }-${ key }`);
                if (existingCounter) {
                    source.removeFeature(existingCounter);
                    existingCounter.dispose();
                }
            });

            list.filter(x => x[1].length).forEach(([_key, value], index) => {
                const key = _key as MapAircraftKeys;
                const existingCounter = getMapFeature('airport-counter', source, `airport-${ airport.airport.icao }-${ key }`);
                if (existingCounter) {
                    existingCounter.setProperties({
                        ...existingCounter.getProperties(),
                        counter: value.length,
                        aircraft: value,
                        totalCount,
                        index,
                        localsLength,
                        atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        aircraftList: airport.aircraftList,
                    });
                }
                else {
                    const feature = createMapFeature('airport-counter', {
                        geometry: new Point([airport.airport.lon, airport.airport.lat]),
                        id: `airport-${ airport.airport.icao }-${ key }`,
                        icao: airport.airport.icao,
                        iata: airport.airport.iata,
                        type: 'airport-counter',
                        index,
                        totalCount,
                        counter: value.length,
                        localsLength,
                        counterType: key,
                        aircraft: value,
                        atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        aircraftList: airport.aircraftList,
                    });
                    source.addFeature(feature);
                }
            });
        }

        // Approach
        if (airport.arrAtc.length) {
            if (!airport.features.length && 'lon' in airport.airport && !airport.airport.isPseudo) {
                const existingCircle = getMapFeature('airport-circle', source, `airport-${ airport.airport.icao }-circle`);
                const existingCircleLabel = getMapFeature('airport-circle-label', source, `airport-${ airport.airport.icao }-circleLabel`);

                if (existingCircle && existingCircleLabel) {
                    existingCircle.setProperties({ ...existingCircle.getProperties(), atc: airport.arrAtc, isTWR, isDuplicated, isBooked });
                    existingCircleLabel.setProperties({
                        ...existingCircleLabel.getProperties(),
                        atc: airport.arrAtc,
                        isTWR,
                        isDuplicated,
                        isBooked,
                        atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        aircraftList: airport.aircraftList,
                    });
                }
                else {
                    const cirleGeometry = createCircle([airport.airport.lon, airport.airport.lat], 50000);

                    const circle = createMapFeature('airport-circle', {
                        geometry: cirleGeometry,
                        id: `airport-${ airport.airport.icao }-circle`,
                        type: 'airport-circle',
                        icao: airport.airport.icao,
                        iata: airport.airport.iata,
                        atc: airport.arrAtc,
                        isTWR,
                        isDuplicated,
                        isBooked,
                    });

                    const extent = cirleGeometry.getExtent();
                    const topCoord = [extent![0], extent![3]];

                    const circleLabel = createMapFeature('airport-circle-label', {
                        geometry: new Point(cirleGeometry.getClosestPoint(topCoord) || topCoord),
                        id: `airport-${ airport.airport.icao }-circleLabel`,
                        type: 'airport-circle-label',
                        icao: airport.airport.icao,
                        iata: airport.airport.iata,
                        atc: airport.arrAtc,
                        isTWR,
                        isDuplicated,
                        isBooked,
                        atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        aircraftList: airport.aircraftList,
                    });

                    source.addFeature(circle);
                    source.addFeature(circleLabel);
                }
            }
            else {
                const leftAtc = airport.arrAtc.filter(x => (isDuplicated || !x.duplicated) && !airport.features.some(y => y.controllers.some(y => y.cid === x.cid && y.callsign === x.callsign)));

                for (const atc of airport.features) {
                    const existingTraconId = `airport-${ airport.airport.icao }-${ atc.id }` as const;

                    const existingTracon = getMapFeature('airport-tracon', source, existingTraconId);
                    const existingTraconLabel = getMapFeature('airport-tracon-label', source, `${ existingTraconId }Label`);

                    const controllers = [
                        ...atc.controllers,
                        ...leftAtc,
                    ];

                    isTWR = controllers.every(x => x.isTWR);
                    isDuplicated = controllers.every(x => x.duplicated);
                    isBooked = controllers.every(x => x.isBooking);

                    if (existingTracon && existingTraconLabel) {
                        existingTracon.setProperties({ ...existingTracon.getProperties(), atc: controllers, isTWR, isDuplicated, isBooked });
                        existingTraconLabel.setProperties({
                            ...existingTraconLabel.getProperties(),
                            atc: controllers,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            aircraftList: airport.aircraftList,
                            atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        });
                    }
                    else {
                        const geometry = geoJson.readGeometry(atc.traconFeature.geometry) as any;

                        const tracon = createMapFeature('airport-tracon', {
                            geometry,
                            id: existingTraconId,
                            type: 'airport-tracon',
                            icao: airport.airport.icao,
                            iata: airport.airport.icao,
                            atc: controllers,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            featureId: atc.id,
                            traconId: atc.traconFeature.properties?.id,
                        });

                        const extent = geometry.getExtent();
                        const topCoord = [extent![0], extent![3]];
                        let textCoord = geometry.getClosestPoint(topCoord) || topCoord;
                        if (atc.traconFeature.properties.label_lat) {
                            textCoord = geometry?.getClosestPoint([atc.traconFeature.properties.label_lon, atc.traconFeature.properties.label_lat]);
                        }

                        const traconLabel = createMapFeature('airport-tracon-label', {
                            geometry: new Point(textCoord),
                            id: `${ existingTraconId }Label`,
                            type: 'airport-tracon-label',
                            icao: airport.airport.icao,
                            iata: airport.airport.icao,
                            atc: controllers,
                            name: atc.traconFeature.properties.name,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            featureId: atc.id,
                            traconId: atc.traconFeature.properties?.id,
                            aircraftList: airport.aircraftList,
                            atcLength: airport.localAtc.filter(x => !x.isATIS).length + airport.arrAtc.length,
                        });

                        source.addFeature(tracon);
                        source.addFeature(traconLabel);
                    }
                }
            }
        }
    }

    const features = source.getFeatures().slice(0);

    for (const feature of features) {
        const properties = feature.getProperties();

        if ('icao' in properties) {
            const airport = map[properties.icao];

            if (!airport) {
                source.removeFeature(feature);
                feature.dispose();
                continue;
            }

            if (isMapFeature('airport-circle', properties) || isMapFeature('airport-circle-label', properties)) {
                if (!airport.arrAtc.length || airport.features.length) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }

            if (isMapFeature('airport-tracon', properties) || isMapFeature('airport-tracon-label', properties)) {
                if (!airport.arrAtc.length || !airport.features.some(x => x.id === properties.featureId)) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }

            if (isMapFeature('airport-atc', properties)) {
                if (!airport.localAtc.length || !airport.localAtc.some(x => (properties.facility.facility === -1 ? x.isATIS : (x.facility === properties.facility.facility && !x.isATIS)) && !!x.booking === properties.facility.booked)) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }
        }
    }
}
