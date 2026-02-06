import type VectorSource from 'ol/source/Vector.js';
import type { AirportListItem } from '~/composables/render/airports/index';
import type { AirportNavigraphData } from '~/components/map/airports/MapAirportsListV2.vue';
import { getCurrentThemeHexColor, getCurrentThemeRgbColor } from '~/composables';
import { Fill, Style, Text, Stroke, Icon } from 'ol/style.js';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import { Point } from 'ol/geom.js';
import type VectorLayer from 'ol/layer/Vector.js';
import { createDefaultStyle } from 'ol/style/Style.js';
import { createCircle } from '~/utils';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';
import { sortControllersByPosition } from '~/composables/vatsim/controllers';
import type { VatsimBooking, VatsimShortenedController } from '~/types/data/vatsim';
import type { MapAircraftKeys } from '~/types/map';
import { getAirportCounters } from '~/composables/vatsim/airport';

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

let styleFillCache: Record<string, Fill> = {};
let styleStrokeCache: Record<string, Stroke> = {};
const styleIconCache: Record<string, Icon> = {};
let styleCache: Record<string, Style> = {};

function getCachedFill(color: string) {
    let cachedFill = styleFillCache[color];
    if (!cachedFill) {
        cachedFill = new Fill({
            color,
        });
        styleFillCache[color] = cachedFill;
    }

    return cachedFill;
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

export function setMapAirports({ source, airports, navigraphData, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
    navigraphData: AirportNavigraphData;
}) {
    const store = useStore();
    const mapStore = useMapStore();
    const facilities = useFacilitiesIds();

    if (layer.getStyle() === createDefaultStyle) {
        styleCache = {};
        styleFillCache = {};
        styleStrokeCache = {};
        layer.setStyle(feature => {
            const showAirportDetails = mapStore.renderedAirports.length < (store.mapSettings.airportCounterLimit ?? 100);

            const properties = feature.getProperties();
            if (isMapFeature('airport', properties)) {
                return [
                    new Style({
                        text: new Text({
                            font: getTextFont('3b-medium'),
                            text: `${ properties.icao }${ !properties.localsLength && showAirportDetails ? '\n•' : '' }`,
                            offsetY: -12,
                            textBaseline: 'top',
                            fill: getCachedFill(properties.color),
                        }),
                        zIndex: properties.localsLength ? 2 : 1,
                    }),
                ];
            }

            if (isMapFeature('airport-circle', properties) || isMapFeature('airport-tracon', properties)) {
                const key = `${ String(store.bookingOverride || properties.isBooked) }-${ String(properties.isDuplicated) }-${ String(properties.selected) }`;
                if (!styleCache[key]) {
                    let fill: string | undefined;

                    if (properties.selected) {
                        fill = (store.bookingOverride || properties.isBooked) ? `rgba(${ getSelectedColorFromSettings('approachBookings', true) || radarColors.info300Rgb.join(',') }, 0.25)` : (`rgba(${ getSelectedColorFromSettings('approach', true) || radarColors.error300Rgb.join(',') }, 0.25)`);
                    }

                    styleCache[key] = new Style({
                        stroke: new Stroke({
                            color: (store.bookingOverride || properties.isBooked) ? getSelectedColorFromSettings('approachBookings') || `rgba(${ radarColors.purple500Rgb.join(',') }, 0.7)` : (getSelectedColorFromSettings('approach') || `rgba(${ radarColors.citrus600Rgb.join(',') }, 0.7)`),
                            width: 2,
                            lineDash: properties.isDuplicated ? [8, 5] : undefined,
                            lineJoin: 'round',
                        }),
                        fill: fill ? getCachedFill(fill) : undefined,
                    });
                }

                return styleCache[key];
            }

            if (!store.mapSettings.visibility?.atcLabels && (isMapFeature('airport-circle-label', properties) || isMapFeature('airport-tracon-label', properties))) {
                const strokeKey = String(store.bookingOverride || properties.isBooked) + String(properties.isTWR);

                if (!styleStrokeCache[strokeKey]) {
                    styleStrokeCache[strokeKey] = new Stroke({
                        width: 2,
                        lineDash: properties.isTWR ? [4, 8] : undefined,
                        lineJoin: 'round',
                        color: (store.bookingOverride || properties.isBooked) ? `rgb(${ getSelectedColorFromSettings('approachBookings', true) || radarColors.purple500Rgb.join(',') })` : (getSelectedColorFromSettings('approach') || radarColors.citrus600Hex),
                    });
                }

                const stroke = styleStrokeCache[strokeKey];

                return new Style({
                    text: new Text({
                        font: getTextFont('caption-medium'),
                        text: properties.isTWR
                            ? (!feature.getProperties()?.traconId || feature.getProperties()?.traconId === properties.icao) ? 'TWR' : feature.getProperties()?.traconId
                            : feature.getProperties()?.traconId || properties.icao,
                        placement: 'point',
                        overflow: true,
                        fill: getCachedFill((store.bookingOverride || properties.isBooked) ? getCurrentThemeHexColor('lightGray200') : (getSelectedColorFromSettings('approach') || radarColors.citrus600Hex)),
                        backgroundFill: getCachedFill(getCurrentThemeHexColor('darkGray900')),
                        backgroundStroke: stroke,
                        padding: [3, 1, 3, 3],
                    }),
                    zIndex: 1,
                });
            }

            if (mapStore.renderedAirports.includes(properties.icao)) {
                if (isMapFeature('airport-atc', properties)) {
                    let letter: string | undefined;

                    switch (properties.facility.facility) {
                        case facilities.ATIS:
                            letter = 'A';
                            break;
                        case facilities.TWR:
                            letter = 'T';
                            break;
                        case facilities.DEL:
                            letter = 'D';
                            break;
                        case facilities.GND:
                            letter = 'G';
                            break;
                    }

                    const width = 14;
                    const offsetX = (properties.index - ((properties.totalCount - 1) / 2)) * (width - 2);

                    const styleCacheKey = String(properties.index) + String(letter) + String(properties.facility.booked) + String(properties.totalCount) + String(properties.selected);
                    if (!styleCache[styleCacheKey]) {
                        if (properties.selected) console.log('test');

                        styleCache[styleCacheKey] = new Style({
                            image: new Icon({
                                src: `/icons/atc/${ letter }${ properties.facility.booked ? '-booked' : '' }.png`,
                                width: width + (properties.selected ? 2 : 0),
                                displacement: [offsetX, -width],
                                declutterMode: 'none',
                            }),
                            zIndex: properties.index,
                        });
                    }

                    return styleCache[styleCacheKey];
                }

                if (isMapFeature('airport-counter', properties) && mapStore.zoom > 4 && store.mapSettings.airportsCounters?.showCounters !== false && showAirportDetails) {
                    const height = 12;
                    let offsetX = 30;
                    if (properties.localsLength > 3) offsetX = 40;
                    const offsetY = ((properties.index - ((properties.totalCount - 1) / 2)) * (height + 2)) + 6;
                    const zIndex = 5;

                    let textColor = getCachedFill(radarColors.green600Hex);

                    if (properties.counterType === 'prefiles') textColor = getCachedFill(getCurrentThemeHexColor('lightGray900'));
                    if (properties.counterType === 'training') textColor = getCachedFill(getCurrentThemeHexColor('purple500'));
                    if (properties.counterType === 'groundArr') textColor = getCachedFill(getCurrentThemeHexColor('red500'));

                    const cacheKey = String(properties.counterType) + String(offsetX) + String(offsetY) + zIndex;
                    if (!styleIconCache[cacheKey]) {
                        styleIconCache[cacheKey] = new Icon({
                            src: `/icons/atc/A-booked.png`,
                            height: 12,
                            displacement: [offsetX, offsetY],
                            declutterMode: 'none',
                        });
                    }

                    if (!styleCache[cacheKey]) {
                        styleCache[cacheKey] = new Style({
                            text: new Text({
                                font: getTextFont('caption-light'),
                                text: '1',
                                offsetX: offsetX + 5,
                                offsetY: offsetY - 11,
                                padding: [2, 10, 0, 10],
                                fill: getCachedFill('transparent'),
                                // backgroundFill: getCachedFill('red'),
                                declutterMode: 'obstacle',
                            }),
                            zIndex: properties.localsLength ? 3 : 2,
                        });
                    }

                    return [
                        new Style({
                            image: styleIconCache[cacheKey],
                            text: new Text({
                                font: getTextFont('caption-medium'),
                                text: properties.counter.toString(),
                                offsetX: offsetX + 10,
                                offsetY: offsetY - 6,
                                textBaseline: 'bottom',
                                textAlign: 'left',
                                fill: textColor,
                                declutterMode: 'none',
                            }),
                            zIndex: 0,
                        }),
                        styleCache[cacheKey],
                    ];
                }
            }
        });
    }

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
                localsLength: airport.localAtc.length,
                atc: [
                    ...airport.localAtc,
                    ...airport.arrAtc,
                ],
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
                lon: airport.airport.lon,
                lat: airport.airport.lat,
                localsLength: airport.localAtc.length,
                color: colorForAirport(airport),
                atc: [
                    ...airport.localAtc,
                    ...airport.arrAtc,
                ],
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
                    existingCircleLabel.setProperties({ ...existingCircleLabel.getProperties(), atc: airport.arrAtc, isTWR, isDuplicated, isBooked });
                }
                else {
                    const cirleGeometry = createCircle([airport.airport.lon, airport.airport.lat], 50000);

                    const circle = createMapFeature('airport-circle', {
                        geometry: cirleGeometry,
                        id: `airport-${ airport.airport.icao }-circle`,
                        type: 'airport-tracon',
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
                        type: 'airport-tracon-label',
                        icao: airport.airport.icao,
                        iata: airport.airport.iata,
                        atc: airport.arrAtc,
                        isTWR,
                        isDuplicated,
                        isBooked,
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

                    isTWR = atc.controllers.every(x => x.isTWR);
                    isDuplicated = atc.controllers.every(x => x.duplicated);
                    isBooked = atc.controllers.every(x => x.isBooking);

                    const controllers = [
                        ...atc.controllers,
                        ...leftAtc,
                    ];

                    if (existingTracon && existingTraconLabel) {
                        existingTracon.setProperties({ ...existingTracon.getProperties(), atc: controllers, isTWR, isDuplicated, isBooked });
                        existingTraconLabel.setProperties({ ...existingTraconLabel.getProperties(), atc: controllers, isTWR, isDuplicated, isBooked });
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
                        });

                        source.addFeature(tracon);
                        source.addFeature(traconLabel);
                    }
                }
            }
        }
    }

    for (const feature of source.getFeatures()) {
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
                if (!airport.localAtc.length || !airport.localAtc.some(x => properties.facility.facility === -1 ? x.isATIS : x.facility === properties.facility.facility)) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }
        }
    }

/*
feature = new Feature({
        geometry: new Point([props.airport.lon, props.airport.lat + (props.airport.isIata ? 300 : 0)]),
        type: 'airport',
        icao: props.airport.icao,
    });

    feature.setStyle(new Style({
        text: new Text({
            font: '12px LibreFranklin',
            text: airportName.value,
            offsetY: -10,
            fill: new Fill({
                color: getAirportColor.value,
            }),
        }),
 */
}
