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
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { MapAircraftKeys } from '~/types/map';
import { getAirportCounters } from '~/composables/vatsim/airport';
import { setAirportStyle } from '~/composables/render/airports/layers/airport-style';

function colorForAirport(airport: AirportListItem) {
    const store = useStore();
    const mapStore = useMapStore();
    const opacity = store.mapSettings.colors?.[store.getCurrentTheme]?.defaultAirport;
    const hasOverlay = mapStore.overlays.some(x => x.type === 'pilot' && (x.data.pilot.airport === airport.icao || x.data.pilot.flight_plan?.departure === airport.icao || x.data.pilot.flight_plan?.arrival === airport.icao));

    if (!hasOverlay) {
        if (!airport.atc?.length) return `rgba(${ getCurrentThemeRgbColor('lightGray800').join(',') }, ${ opacity ?? 0.6 })`;
        return `rgba(${ getCurrentThemeRgbColor('lightGray200').join(',') }, ${ opacity ?? 0.8 })`;
    }

    if (!airport.atc?.length) return `rgba(${ radarColors.orange500Rgb.join(',') }, ${ opacity ?? 0.8 })`;
    return `rgba(${ radarColors.orange500Rgb.join(',') }, ${ opacity ?? 0.9 })`;
}

interface Facility {
    facility: number;
    atc: VatsimShortenedController[];
}

function createFacility(facilityId: number): Facility {
    return {
        facility: facilityId,
        atc: [],
    };
}

export function setMapAirports({ source, airports, layer }: {
    source: VectorSource;
    layer: VectorLayer;
    airports: DataAirport[];
}) {
    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();
    const facilitiesIds = useFacilitiesIds();

    if (layer.getStyle() === createDefaultStyle) setAirportStyle(layer);

    const map: Record<string, DataAirport> = {};

    for (const airport of airports) {
        map[airport.icao] = airport;

        // Locals
        const facilitiesMap = new Map<number, Facility>();
        const locals = airport.atc.filter(x => x.facility !== facilitiesIds.APP && x.facility !== facilitiesIds.CTR && x.facility !== facilitiesIds.FSS);
        const featuresCallsigns = new Set<string>(airport.features?.flatMap(x => x.controllers.map(x => x.callsign)));

        locals.forEach(local => {
            if (featuresCallsigns.has(local.callsign) || dataStore.atcAddedDuringUpdate.value.has(local.callsign)) return;
            if (local.facility === facilitiesIds.CTR || local.facility === facilitiesIds.FSS) return;
            const facilityId = local.isATIS ? -1 : local.facility;
            let facility = facilitiesMap.get(facilityId);

            if (local.isATIS && store.mapSettings.hideATISOnly && !locals.some(x => !x.isATIS)) {
                let existingFacility = getMapFeature('airport-atc', source, `airport-${ airport.icao }--1`);

                if (existingFacility) {
                    source.removeFeature(existingFacility);
                    existingFacility.dispose();
                    existingFacility = null;
                }

                return;
            }

            if (!facility) {
                facility = createFacility(facilityId);
                facilitiesMap.set(facilityId, facility);
            }

            if (!local.isBooking) {
                const booking = locals.find(x => x.isBooking && x.cid === local.cid && x.callsign === local.callsign);
                if (booking) {
                    local.booking = booking.booking;
                }
            }

            facility.atc.push(local);
        });

        const facilities = sortControllersByPosition(Array.from(facilitiesMap.values()));
        const atc: VatsimShortenedController[] = [];
        const atcLength = airport.atc.filter(x => !x.isATIS && !x.isBooking).length;

        facilities.forEach((facility, index) => {
            const key = `airport-${ airport.icao }-${ facility.facility }` as const;
            const existingFacility = getMapFeature('airport-atc', source, key);
            const bookedOnly = facility.atc.every(x => x.isBooking);

            if (!bookedOnly) {
                facility.atc = facility.atc.filter(x => !x.isBooking);
            }

            atc.push(...facility.atc);

            if (facility.facility === facilitiesIds.APP) return;

            if (existingFacility) {
                existingFacility.setProperties({
                    facility,
                    index,
                    totalCount: facilities.length,
                });
            }
            else if (airport.airport) {
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

        // Airport
        const existingFeature = getMapFeature('airport', source, `airport-${ airport.icao }`);
        if (existingFeature) {
            const color = colorForAirport(airport);

            existingFeature.setProperties({
                color,
                aircraftList: airport.aircraft,
                atcLength,
                atc: sortControllersByPosition(airport.atc),
            });
        }
        else if (airport.airport) {
            source.addFeature(createMapFeature('airport', {
                geometry: new Point([airport.airport.lon, airport.airport.lat]),
                type: 'airport',
                id: `airport-${ airport.airport.icao }`,
                icao: airport.airport.icao,
                iata: airport.airport.iata,
                name: airport.airport.name,
                isPseudo: !dataStore.vatspy.value?.data.keyAirports.realIcao[airport.icao],
                lon: airport.airport.lon,
                lat: airport.airport.lat,
                atcLength,
                aircraftList: airport.aircraft,
                color: colorForAirport(airport),
                atc: sortControllersByPosition(atc),
            }));
        }

        const appr = airport.atc.filter(x => x.facility === facilitiesIds.APP && !dataStore.atcAddedDuringUpdate.value.has(x.callsign));

        let isDuplicated = appr.every(x => x.duplicated);
        let isBooked = appr.every(x => x.isBooking);

        // Counters
        if (airport.aircraft && mapStore.renderedAirports?.includes(airport.icao)) {
            const counters = getAirportCounters(airport.aircraft);
            const list = Object.entries(counters);
            const totalCount = list.filter(x => x[1].length).length;
            const localsLength = facilities.length;

            list.filter(x => !x[1].length).forEach(([_key, value]) => {
                const key = _key as MapAircraftKeys;
                const existingCounter = getMapFeature('airport-counter', source, `airport-${ airport.icao }-${ key }`);
                if (existingCounter) {
                    source.removeFeature(existingCounter);
                    existingCounter.dispose();
                }
            });

            list.filter(x => x[1].length).forEach(([_key, value], index) => {
                const key = _key as MapAircraftKeys;
                const existingCounter = getMapFeature('airport-counter', source, `airport-${ airport.icao }-${ key }`);
                if (existingCounter) {
                    existingCounter.setProperties({
                        counter: value.length,
                        aircraft: value,
                        totalCount,
                        index,
                        localsLength,
                        atcLength,
                        aircraftList: airport.aircraft,
                    });
                }
                else if (airport.airport) {
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
                        atcLength,
                        aircraftList: airport.aircraft,
                    });
                    source.addFeature(feature);
                }
            });
        }

        // Approach
        if (appr.length || airport.features?.length) {
            const atc = appr.filter(x => isDuplicated || !x.duplicated);

            if (!airport.features?.length && airport.airport && !airport.airport.isPseudo) {
                const existingCircle = getMapFeature('airport-circle', source, `airport-${ airport.airport.icao }-circle`);
                const existingCircleLabel = getMapFeature('airport-circle-label', source, `airport-${ airport.airport.icao }-circleLabel`);

                if (existingCircle && existingCircleLabel) {
                    existingCircle.setProperties({ atc, isTWR: false, isDuplicated, isBooked });
                    existingCircleLabel.setProperties({
                        atc,
                        isTWR: false,
                        isDuplicated,
                        isBooked,
                        atcLength,
                        aircraftList: airport.aircraft,
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
                        atc,
                        isTWR: false,
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
                        atc,
                        isTWR: false,
                        isDuplicated,
                        isBooked,
                        atcLength,
                        aircraftList: airport.aircraft,
                    });

                    source.addFeature(circle);
                    source.addFeature(circleLabel);
                }
            }
            else {
                const leftAtc = appr.filter(x => (isDuplicated || !x.duplicated) && !airport.features?.some(y => y.controllers.some(y => y.cid === x.cid && y.callsign === x.callsign)));

                for (const atc of airport.features ?? []) {
                    const existingTraconId = `airport-${ airport.icao }-${ atc.id }` as const;

                    const existingTracon = getMapFeature('airport-tracon', source, existingTraconId);
                    const existingTraconLabel = getMapFeature('airport-tracon-label', source, `${ existingTraconId }Label`);

                    const controllers = [
                        ...atc.controllers.filter(x => isDuplicated || !x.duplicated),
                        ...leftAtc.filter(x => isDuplicated || !x.duplicated),
                    ];

                    const isTWR = controllers.every(x => x.facility !== facilitiesIds.APP);
                    isDuplicated = controllers.every(x => x.duplicated);
                    isBooked = controllers.every(x => x.isBooking);

                    if (existingTracon && existingTraconLabel) {
                        existingTracon.setProperties({ atc: controllers, isTWR, isDuplicated, isBooked });
                        existingTraconLabel.setProperties({
                            atc: controllers,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            aircraftList: airport.aircraft,
                            atcLength,
                        });
                    }
                    else {
                        const geometry = geoJson.readGeometry(atc.traconFeature.geometry) as any;

                        const tracon = createMapFeature('airport-tracon', {
                            geometry,
                            id: existingTraconId,
                            type: 'airport-tracon',
                            icao: airport.icao,
                            iata: airport.icao,
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
                            icao: airport.icao,
                            iata: airport.icao,
                            atc: controllers,
                            name: atc.traconFeature.properties.name,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            featureId: atc.id,
                            traconId: atc.traconFeature.properties?.id,
                            aircraftList: airport.aircraft,
                            atcLength,
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
                if (!airport.atc.some(x => x.facility === facilitiesIds.APP) || airport.features?.length) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }

            if (isMapFeature('airport-tracon', properties) || isMapFeature('airport-tracon-label', properties)) {
                if (!airport.features?.some(x => x.id === properties.featureId)) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }

            if (isMapFeature('airport-atc', properties)) {
                const locals = airport.atc.filter(x => x.facility !== facilitiesIds.APP);

                if (!locals.length || !locals.some(x => properties.facility.facility === -1 ? x.isATIS : (x.facility === properties.facility.facility && !x.isATIS))) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }
        }
    }
}
