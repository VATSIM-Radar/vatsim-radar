import type VectorLayer from 'ol/layer/Vector';
import { isMapFeature } from '~/utils/map/entities';
import type { DeclutterMode } from 'ol/style/Style';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';
import { getCurrentThemeHexColor } from '~/composables';
import { getFacilityPositionColor } from '~/composables/vatsim/controllers';
import type { MapAircraftList } from '~/types/map';

let styleFillCache: Record<string, Fill> = {};
let styleStrokeCache: Record<string, Stroke> = {};
let styleIconCache: Record<string, Icon> = {};
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

function calculateZIndex({ aircraft, atc}: { aircraft: MapAircraftList; atc: number }) {
    if (atc) return 1000;
    return Object.values(aircraft).reduce((acc, x) => acc + x.length, 0);
}

export function setAirportStyle(layer: VectorLayer) {
    const store = useStore();
    const mapStore = useMapStore();
    const facilities = useFacilitiesIds();

    styleCache = {};
    styleFillCache = {};
    styleStrokeCache = {};
    styleIconCache = {};

    // TODO: rework cache https://stackoverflow.com/questions/59032715/how-to-cache-styles-but-still-set-individual-text

    layer.setStyle(feature => {
        const showAirportDetails = mapStore.renderedAirports.length < (store.mapSettings.airportCounterLimit ?? 100) && mapStore.zoom > 5.5;

        const properties = feature.getProperties();
        if (isMapFeature('airport', properties)) {
            let declutterMode: DeclutterMode = properties.atcLength ? 'obstacle' : 'declutter';

            if (store.mapSettings.airportsHide === 'all') declutterMode = 'declutter';
            else if (store.mapSettings.airportsHide === 'unstaffed') declutterMode = properties.atcLength ? 'obstacle' : 'declutter';
            else if (store.mapSettings.airportsHide === 'none') declutterMode = 'obstacle';

            return [
                new Style({
                    text: new Text({
                        font: getTextFont('3b-medium'),
                        text: `${ properties.icao }${ !properties.atcLength && showAirportDetails ? '\n•' : '' }`,
                        offsetY: -12,
                        textBaseline: 'top',
                        fill: getCachedFill(properties.color),
                        declutterMode,
                    }),
                    zIndex: calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength }),
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
                zIndex: calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength }) - 1,
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

                const styleCacheKey = String(properties.index) + String(letter) + String(properties.facility.booked) + String(properties.totalCount) + String(properties.selected) + String(showAirportDetails);

                if (!styleCache[styleCacheKey]) {
                    if (!showAirportDetails) {
                        styleCache[styleCacheKey] = new Style({
                            text: new Text({
                                font: 'normal 1px/100% Jura, Arial, sans-serif',
                                text: letter,
                                offsetX: offsetX,
                                offsetY: 10,
                                padding: [2, 5, 0, 5],
                                fill: getCachedFill('transparent'),
                                backgroundFill: getCachedFill(properties.facility.booked ? getCurrentThemeHexColor('lightGray800') : getFacilityPositionColor(properties.facility.facility, true)),
                                declutterMode: 'obstacle',
                            }),
                            zIndex: properties.index + (properties.selected ? 5 : 0),
                        });
                    }
                    else {
                        styleCache[styleCacheKey] = new Style({
                            image: new Icon({
                                src: `/icons/atc/${ letter }${ properties.facility.booked ? '-booked' : '' }.png`,
                                width: width + (properties.selected ? 2 : 0),
                                displacement: [offsetX, -width],
                                declutterMode: 'none',
                            }),
                            zIndex: properties.index + (properties.selected ? 5 : 0),
                        });
                    }
                }

                return styleCache[styleCacheKey];
            }

            if (isMapFeature('airport-counter', properties) && mapStore.zoom > 4 && store.mapSettings.airportsCounters?.showCounters !== false && showAirportDetails) {
                const height = 12;
                let offsetX = 35;
                if (properties.localsLength > 3) offsetX = 40;
                const offsetY = ((properties.index - ((properties.totalCount - 1) / 2)) * (height - 1));
                const zIndex = 5;

                let textColor = getCachedFill(radarColors.green600Hex);

                if (properties.counterType === 'prefiles') textColor = getCachedFill(getCurrentThemeHexColor('lightGray900'));
                if (properties.counterType === 'training') textColor = getCachedFill(getCurrentThemeHexColor('purple500'));
                if (properties.counterType === 'groundArr') textColor = getCachedFill(getCurrentThemeHexColor('red500'));

                const cacheKey = String(properties.counterType) + String(offsetX) + String(offsetY) + zIndex;
                if (!styleIconCache[cacheKey]) {
                    let key;
                    if (properties.counterType === 'groundDep') key = 'departure';
                    else if (properties.counterType === 'groundArr') key = 'arrived';
                    else if (properties.counterType === 'training') key = 'locals';
                    else if (properties.counterType === 'prefiles') key = 'prefile';

                    styleIconCache[cacheKey] = new Icon({
                        src: `/icons/atc/${ key }.png`,
                        height: 5,
                        displacement: [offsetX, -offsetY],
                        declutterMode: 'none',
                    });
                }

                if (!styleCache[cacheKey]) {
                    styleCache[cacheKey] = new Style({
                        text: new Text({
                            font: getTextFont('caption-light'),
                            text: '1',
                            offsetX: offsetX + 7,
                            offsetY: offsetY,
                            padding: [-2, 10, 0, 10],
                            fill: getCachedFill('transparent'),
                            backgroundFill: getCachedFill('transparent'),
                            declutterMode: 'obstacle',
                        }),
                        zIndex: calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength }) + 1,
                    });
                }

                return [
                    new Style({
                        image: styleIconCache[cacheKey],
                        text: new Text({
                            font: getTextFont('caption-medium').replace('11px', '10px'),
                            text: properties.counter.toString(),
                            offsetX: offsetX + 9,
                            offsetY: offsetY + 5,
                            textBaseline: 'bottom',
                            textAlign: 'left',
                            backgroundFill: getCachedFill('transparent'),
                            padding: [-2, 0, -2, 7],
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
