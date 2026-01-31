import type VectorSource from 'ol/source/Vector.js';
import type { AirportListItem } from '~/composables/render/airports/index';
import type { AirportNavigraphData } from '~/components/map/airports/MapAirportsListV2.vue';
import { getCurrentThemeRgbColor } from '~/composables';
import { Fill, Style, Text, Stroke } from 'ol/style.js';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import { Point } from 'ol/geom.js';
import type VectorLayer from 'ol/layer/Vector.js';
import { createDefaultStyle } from 'ol/style/Style.js';
import { createCircle } from '~/utils';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';

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

let airportsFillCache: Record<string, Fill> = {};
let airportsStyleCache: Record<string, Style> = {};

function getCachedFill(color: string) {
    let cachedFill = airportsFillCache[color];
    if (!cachedFill) {
        cachedFill = new Fill({
            color,
        });
        airportsFillCache[color] = cachedFill;
    }

    return cachedFill;
}

export function setMapAirports({ source, airports, navigraphData, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
    navigraphData: AirportNavigraphData;
}) {
    const store = useStore();

    if (layer.getStyle() === createDefaultStyle) {
        airportsStyleCache = {};
        airportsFillCache = {};
        layer.setStyle(feature => {
            const properties = feature.getProperties();

            if (isMapFeature('airport', properties)) {
                return [
                    new Style({
                        text: new Text({
                            font: getTextFont('3b-medium'),
                            text: `${ properties.icao }${ !properties.localsLength ? '\n•' : '' }`,
                            offsetY: -12,
                            textBaseline: 'top',
                            fill: getCachedFill(properties.color),
                        }),
                        zIndex: properties.localsLength ? 2 : 1,
                    }),
                    new Style({
                        text: new Text({
                            font: getTextFont('caption-medium'),
                            text: `T`,
                            backgroundFill: getCachedFill(radarColors.citrus600Hex),
                            offsetY: 40,
                            offsetX: 10,
                            padding: [5, 4, 5, 5],
                            fill: getCachedFill(radarColors.lightGray200Hex),
                            backgroundStroke: new Stroke({
                                color: radarColors.citrus600Hex,
                                lineJoin: 'round',
                                lineCap: 'round',
                            }),
                        }),
                        zIndex: 5,
                    }),
                    new Style({
                        text: new Text({
                            font: getTextFont('caption-medium'),
                            text: `T`,
                            backgroundFill: getCachedFill(radarColors.citrus600Hex),
                            offsetY: 40,
                            offsetX: -10,
                            padding: [5, 4, 5, 5],
                            fill: getCachedFill(radarColors.lightGray200Hex),
                            backgroundStroke: new Stroke({
                                color: radarColors.citrus600Hex,
                            }),
                        }),
                        zIndex: 5,
                    }),
                ];
            }

            if (isMapFeature('airport-circle', properties) || isMapFeature('airport-tracon', properties)) {
                const key = `${ String(store.bookingOverride || properties.isBooked) }-${ String(properties.isDuplicated) }`;
                airportsStyleCache[key] ??= new Style({
                    stroke: new Stroke({
                        color: (store.bookingOverride || properties.isBooked) ? getSelectedColorFromSettings('approachBookings') || `rgba(${ radarColors.info300Rgb.join(',') }, 0.7)` : (getSelectedColorFromSettings('approach') || `rgba(${ radarColors.error300Rgb.join(',') }, 0.7)`),
                        width: 2,
                        lineDash: properties.isDuplicated ? [8, 5] : undefined,
                        lineJoin: 'round',
                    }),
                });

                return airportsStyleCache[key];
            }

            if (!store.mapSettings.visibility?.atcLabels && (isMapFeature('airport-circle-label', properties) || isMapFeature('airport-tracon-label', properties))) {
                return new Style({
                    text: new Text({
                        font: getTextFont('caption-medium'),
                        text: properties.isTWR
                            ? (!feature.getProperties()?._traconId || feature.getProperties()?._traconId === properties.icao) ? 'TWR' : feature.getProperties()?._traconId
                            : feature.getProperties()?._traconId || properties.icao,
                        placement: 'point',
                        overflow: true,
                        fill: new Fill({
                            color: (store.bookingOverride || properties.isBooked) ? radarColors.lightgray125Hex : (getSelectedColorFromSettings('approach') || radarColors.error400Hex),
                        }),
                        backgroundFill: new Fill({
                            color: getCurrentThemeHexColor('darkgray900'),
                        }),
                        backgroundStroke: new Stroke({
                            width: 2,
                            lineDash: properties.isTWR ? [4, 8] : undefined,
                            lineJoin: 'round',
                            color: (store.bookingOverride || properties.isBooked) ? `rgb(${ getSelectedColorFromSettings('approachBookings', true) || radarColors.info300Rgb.join(',') })` : (getSelectedColorFromSettings('approach') || radarColors.error400Hex),
                        }),
                        padding: [3, 1, 3, 3],
                    }),
                    zIndex: 3,
                });
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

            if (properties.localsLength !== airport.localAtc.length || properties.color !== color) {
                existingFeature.setProperties({ ...properties, color, localsLength: airport.localAtc.length });
                existingFeature.changed();
            }
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
            }));
        }

        const isTWR = airport.arrAtc.every(x => x.isTWR);
        const isDuplicated = airport.arrAtc.every(x => x.duplicated);
        const isBooked = airport.arrAtc.every(x => x.isBooking);


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
                        iata: airport.airport.icao,
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
                        iata: airport.airport.icao,
                        atc: airport.arrAtc,
                        name: airport.airport.name,
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
                    const existingTracon = getMapFeature('airport-tracon', source, `airport-${ airport.airport.icao }-${ atc.traconFeature }`);
                    const existingTraconLabel = getMapFeature('airport-tracon-label', source, `airport-${ airport.airport.icao }-${ atc.traconFeature }Label`);

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
                            id: `airport-${ airport.airport.icao }-${ atc.id }`,
                            type: 'airport-tracon',
                            icao: airport.airport.icao,
                            iata: airport.airport.icao,
                            atc: controllers,
                            isTWR,
                            isDuplicated,
                            isBooked,
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
                            id: `airport-${ airport.airport.icao }-${ atc.id }Label`,
                            type: 'airport-tracon-label',
                            icao: airport.airport.icao,
                            iata: airport.airport.icao,
                            atc: airport.arrAtc,
                            name: airport.airport.name,
                            isTWR,
                            isDuplicated,
                            isBooked,
                            traconId: atc.traconFeature.properties?.id,
                        });

                        source.addFeature(tracon);
                        source.addFeature(traconLabel);
                    }
                }
            }
        }
    }

    console.time('airports-clear');
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

            /* if (isMapFeature('airport-tracon', properties) || isMapFeature('airport-tracon-label', properties)) {
                if (!airport.arrAtc.length || !airport.features.some(x => x.id === properties.traconId)) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            }*/
        }
    }
    console.timeEnd('airports-clear');

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
