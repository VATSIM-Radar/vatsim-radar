import type VectorLayer from 'ol/layer/Vector';
import { isMapFeature } from '~/utils/map/entities';
import type { DeclutterMode } from 'ol/style/Style';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { getSelectedColorFromSettings, getSelectedColorTransparencyFromSettings } from '~/composables/settings/colors';
import { getCurrentThemeHexColor } from '~/composables';
import { getFacilityPositionColor } from '~/composables/vatsim/controllers';
import type { MapAircraftList } from '~/types/map';

let styleFillCache: Record<string, Fill> = {};
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

function calculateZIndex({ aircraft, atc }: { aircraft: MapAircraftList; atc: number }) {
    if (atc) return 1000;
    return Object.values(aircraft).reduce((acc, x) => acc + x.length, 0);
}

function getDeclutterMode(atcLength: number) {
    let declutterMode: DeclutterMode = atcLength ? 'obstacle' : 'declutter';
    const store = useStore();

    if (store.mapSettings.airportsHide === 'all') declutterMode = 'declutter';
    else if (store.mapSettings.airportsHide === 'unstaffed') declutterMode = atcLength ? 'obstacle' : 'declutter';
    else if (store.mapSettings.airportsHide === 'none') declutterMode = 'obstacle';

    return declutterMode;
}

export function setAirportStyle(layer: VectorLayer) {
    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();
    const uirs = dataStore.vatspy.value?.data.uirs.map(x => x.icao) ?? [];
    const facilities = useFacilitiesIds();

    styleCache = {};
    styleFillCache = {};

    layer.setStyle(feature => {
        const showAirportDetails = mapStore.showAirportDetails;

        const properties = feature.getProperties();
        if (isMapFeature('airport', properties)) {
            if (properties.isPseudo) return;
            const declutterMode = getDeclutterMode(properties.atcLength);

            const zIndex = calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength });
            const key = `${ properties.icao }-${ declutterMode }`;

            if (!styleCache[key]) {
                styleCache[key] = new Style({
                    text: new Text({
                        font: getTextFont('caption-medium'),
                        text: '',
                        offsetY: -8,
                        textBaseline: 'top',
                        fill: getCachedFill(properties.color),
                        declutterMode,
                    }),
                    zIndex,
                });
            }

            styleCache[key].getText()!.setText(`${ properties.icao }${ !properties.atc.length && showAirportDetails ? '\n•' : '' }`);
            styleCache[key].setZIndex(zIndex);

            return [styleCache[key]];
        }

        if (!isHideAtcType('approach')) {
            if (isMapFeature('airport-circle', properties) || isMapFeature('airport-tracon', properties)) {
                const isDuplicated = properties.isDuplicated && properties.atc.every(x => x.duplicatedBy?.endsWith('_CTR') || x.duplicatedBy?.endsWith('_FSS'));
                const isUir = isDuplicated && properties.atc.some(x => x.duplicatedBy && uirs.some(y => x.duplicatedBy!.startsWith(y)));
                const key = `${ String(store.bookingOverride || properties.isBooked) }-${ String(isUir) }-${ String(isDuplicated) }-${ String(properties.isDuplicated) }-${ String(properties.selected) }`;

                if (!styleCache[key]) {
                    let fill: string | undefined;

                    let mainColor = (store.bookingOverride || properties.isBooked)
                        ? getSelectedColorFromSettings('approachBookings', true) || radarColors.info300Rgb.join(',')
                        : getSelectedColorFromSettings('approach', true) || radarColors.error300Rgb.join(',');

                    const mainTransparency = 0.7;

                    if (isDuplicated) {
                        const isUir = properties.atc.some(x => x.duplicatedBy && uirs.some(y => x.duplicatedBy!.startsWith(y)));

                        mainColor = isUir
                            ? getSelectedColorFromSettings('uirs', true) || getCurrentThemeRgbColor('purple600').join(',')
                            : getSelectedColorFromSettings('firs', true) || getCurrentThemeRgbColor('green700').join(',');
                    }

                    if (properties.selected) {
                        fill = (store.bookingOverride || properties.isBooked) ? `rgba(${ mainColor }, 0.25)` : (`rgba(${ mainColor }, 0.25)`);
                    }

                    styleCache[key] = new Style({
                        stroke: new Stroke({
                            color: (store.bookingOverride || properties.isBooked)
                                ? getSelectedColorFromSettings('approachBookings') || `rgba(${ mainColor }, ${ mainTransparency })`
                                : ((isDuplicated ? undefined : getSelectedColorFromSettings('approach')) || `rgba(${ mainColor }, ${ mainTransparency })`),
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
                const declutterMode = getDeclutterMode(0);
                const isDuplicated = properties.isDuplicated && properties.atc.every(x => x.duplicatedBy?.endsWith('_CTR') || x.duplicatedBy?.endsWith('_FSS'));
                const isUir = isDuplicated && properties.atc.some(x => x.duplicatedBy && uirs.some(y => x.duplicatedBy!.startsWith(y)));
                const strokeKey = String(store.bookingOverride || properties.isBooked) + String(isUir) + String(isDuplicated) + String(properties.isDuplicated) + String(properties.isTWR) + String(declutterMode);

                if (!styleCache[strokeKey]) {
                    let defaultColor = getSelectedColorFromSettings('approach', true) || radarColors.citrus600Rgb.join(',');
                    let defaultTransparency = 1;

                    if (isDuplicated) {
                        const isUir = properties.atc.some(x => x.duplicatedBy && uirs.some(y => x.duplicatedBy!.startsWith(y)));

                        defaultColor = isUir
                            ? getSelectedColorFromSettings('uirs', true) || getCurrentThemeRgbColor('purple600')?.join(',')
                            : getSelectedColorFromSettings('firs', true) || getCurrentThemeRgbColor('green700')?.join(',');

                        defaultTransparency = getSelectedColorTransparencyFromSettings(isUir ? 'uirs' : 'firs') ?? 1;
                    }

                    styleCache[strokeKey] = new Style({
                        text: new Text({
                            font: getTextFont('caption-medium'),
                            text: '',
                            placement: 'point',
                            overflow: true,
                            fill: getCachedFill((store.bookingOverride || properties.isBooked) ? getCurrentThemeHexColor('lightGray200') : `rgb(${ defaultColor })`),
                            backgroundFill: getCachedFill(getCurrentThemeHexColor('darkGray900')),
                            backgroundStroke: new Stroke({
                                width: 2,
                                lineDash: properties.isTWR ? [4, 8] : undefined,
                                lineJoin: 'round',
                                color: (store.bookingOverride || properties.isBooked) ? `rgb(${ getSelectedColorFromSettings('approachBookings', true) || radarColors.purple500Rgb.join(',') })` : `rgba(${ defaultColor }, ${ defaultTransparency })`,
                            }),
                            declutterMode,
                            padding: [3, 1, 2, 3],
                        }),
                        zIndex: 0,
                    });
                }

                styleCache[strokeKey].getText()!.setText(properties.isTWR
                    ? (!feature.getProperties()?.traconId || feature.getProperties()?.traconId === properties.icao) ? 'TWR' : feature.getProperties()?.traconId
                    : feature.getProperties()?.traconId || properties.icao);
                styleCache[strokeKey].setZIndex(calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength }) - 1);

                return styleCache[strokeKey];
            }
        }

        if (!isHideAtcType('ground') && mapStore.renderedAirports?.includes(properties.icao)) {
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

                const booked = properties.facility.atc.every(x => x.isBooking);

                const styleCacheKey = String(properties.index) + String(letter) + String(booked) + String(properties.totalCount) + String(properties.selected) + String(mapStore.compactAirportView);

                if (!styleCache[styleCacheKey]) {
                    if (mapStore.compactAirportView) {
                        styleCache[styleCacheKey] = new Style({
                            text: new Text({
                                font: 'normal 1px/100% Jura, Arial, sans-serif',
                                text: 'A',
                                offsetX: offsetX,
                                offsetY: 10,
                                padding: [2, 4, 0, 5],
                                fill: getCachedFill('transparent'),
                                backgroundFill: getCachedFill(`rgba(${ getFacilityPositionColor(properties.facility.facility, true).join(',') }, ${ booked ? 0.5 : 1 })`),
                                declutterMode: 'none',
                            }),
                            zIndex: properties.index + (properties.selected ? 5 : 0) + 100,
                        });
                    }
                    else {
                        styleCache[styleCacheKey] = new Style({
                            image: new Icon({
                                src: `/icons/atc/${ letter }${ booked ? '-booked' : '' }.png`,
                                width: width + (properties.selected ? 2 : 0),
                                displacement: [offsetX, -width],
                                declutterMode: 'none',
                            }),
                            zIndex: properties.index + (properties.selected ? 5 : 0) + 100,
                        });
                    }
                }

                return styleCache[styleCacheKey];
            }

            if (isMapFeature('airport-counter', properties) && mapStore.zoom > 4 && store.mapSettings.airportsCounters?.showCounters !== false && showAirportDetails) {
                const height = 12;
                let offsetX = 30;
                if (properties.localsLength > 3) offsetX = 35;
                const offsetY = ((properties.index - ((properties.totalCount - 1) / 2)) * (height - 1));

                let textColor = getCachedFill(radarColors.green600Hex);

                if (properties.counterType === 'prefiles') textColor = getCachedFill(getCurrentThemeHexColor('lightGray900'));
                if (properties.counterType === 'training') textColor = getCachedFill(getCurrentThemeHexColor('purple500'));
                if (properties.counterType === 'groundArr') textColor = getCachedFill(getCurrentThemeHexColor('red500'));

                const cacheKey = String(properties.counterType);
                const fakeCacheKey = `${ cacheKey }-fake`;

                if (!styleCache[fakeCacheKey]) {
                    styleCache[fakeCacheKey] = new Style({
                        text: new Text({
                            font: getTextFont('caption-light'),
                            text: '1',
                            offsetX: 0,
                            offsetY: 0,
                            padding: [-2, 10, -2, 7],
                            fill: getCachedFill('transparent'),
                            backgroundFill: getCachedFill('transparent'),
                            declutterMode: 'obstacle',
                        }),
                        zIndex: 0,
                    });
                }

                styleCache[fakeCacheKey].getText()!.setOffsetX(offsetX + 7);
                styleCache[fakeCacheKey].getText()!.setOffsetY(offsetY);
                styleCache[fakeCacheKey].setZIndex(calculateZIndex({ aircraft: properties.aircraftList, atc: properties.atcLength }) + 1);

                if (!styleCache[cacheKey]) {
                    let key;
                    if (properties.counterType === 'groundDep') key = 'departure';
                    else if (properties.counterType === 'groundArr') key = 'arrived';
                    else if (properties.counterType === 'training') key = 'locals';
                    else if (properties.counterType === 'prefiles') key = 'prefile';

                    styleCache[cacheKey] = new Style({
                        image: new Icon({
                            src: `/icons/atc/${ key }.png`,
                            height: 5,
                            displacement: [0, -0],
                            declutterMode: 'none',
                        }),
                        text: new Text({
                            font: getTextFont('caption-medium').replace('11px', '10px'),
                            text: '',
                            offsetX: 0,
                            offsetY: 0,
                            textBaseline: 'bottom',
                            textAlign: 'left',
                            backgroundFill: getCachedFill('transparent'),
                            padding: [-2, 0, -2, 7],
                            fill: textColor,
                            declutterMode: 'none',
                        }),
                        zIndex: 0,
                    });
                }

                styleCache[cacheKey].getImage()!.setDisplacement([offsetX, -offsetY]);
                styleCache[cacheKey].getText()!.setOffsetX(offsetX + 9);
                styleCache[cacheKey].getText()!.setOffsetY(offsetY + 6);
                styleCache[cacheKey].getText()!.setText(properties.counter.toString());

                return [
                    styleCache[cacheKey],
                    styleCache[fakeCacheKey],
                ];
            }
        }
    });
}
