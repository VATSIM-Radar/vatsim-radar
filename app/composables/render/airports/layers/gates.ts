import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type { AirportNavigraphData } from '~/components/map/layers/MapAirportsList.vue';
import { getCurrentThemeRgbColor } from '~/composables';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { toRadians } from 'ol/math';
import { Point } from 'ol/geom';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';
import { getGatesMatch } from '~/utils/shared/vatsim';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import { createDefaultStyle } from 'ol/style/Style';

const setAirports = new Set<string>();

let styleFillCache: Record<string, Fill> = {};
let styleStrokeCache: Record<string, Stroke> = {};
let styleCache: Record<string, Style> = {};

export function setMapGatesRunways({ source, airports, navigraphData, layer }: {
    source: VectorSource;
    layer: VectorLayer;
    airports: DataAirport[];
    navigraphData: AirportNavigraphData;
}) {
    const dataStore = useDataStore();
    const store = useStore();
    styleFillCache = {};
    styleStrokeCache = {};
    styleCache = {};

    if (layer.getStyle() === createDefaultStyle) {
        layer.setStyle(feature => {
            const properties = feature.getProperties();

            if (isMapFeature('airport-navigraph', properties)) {
                if (properties.featureType === 'gate') {
                    if (!styleFillCache[`gate${ properties.gateColor }`]) {
                        styleFillCache[`gate${ properties.gateColor }`] = new Fill({
                            color: properties.gateColor,
                        });
                    }

                    if (!styleCache.gates) {
                        styleCache.gates = new Style({
                            text: new Text({
                                font: getTextFont('caption-light'),
                                text: '',
                                textAlign: 'center',
                                fill: styleFillCache[`gate${ properties.gateColor }`],
                                backgroundFill: styleFillCache.gateDefault,
                                backgroundStroke: styleStrokeCache.gateDefault,
                                rotation: toRadians(0),
                                padding: [2, 0, 1, 2],
                            }),
                            zIndex: 0,
                        });
                    }

                    if (styleCache.gates.getText()!.getFill() !== styleFillCache[`gate${ properties.gateColor }`]) {
                        styleCache.gates.getText()!.setFill(styleFillCache[`gate${ properties.gateColor }`]);
                    }
                    styleCache.gates.getText()!.setText(properties.identifier!);
                    styleCache.gates.setZIndex(properties.trulyOccupied ? 2 : properties.maybeOccupied ? 1 : 0);

                    return styleCache.gates;
                }
                else if (properties.featureType === 'runway') {
                    if (!styleFillCache[`runway${ properties.gateColor }`]) {
                        styleFillCache[`runway${ properties.gateColor }`] = new Fill({
                            color: properties.gateColor,
                        });
                    }

                    if (!styleCache.runways) {
                        styleCache.runways = new Style({
                            text: new Text({
                                font: 'bold 12px LibreFranklin',
                                text: '',
                                rotation: 0,
                                rotateWithView: true,
                                fill: styleFillCache[`runway${ properties.gateColor }`],
                            }),
                        });
                    }

                    if (styleCache.runways.getText()!.getFill() !== styleFillCache[`runway${ properties.gateColor }`]) {
                        styleCache.runways.getText()!.setFill(styleFillCache[`runway${ properties.gateColor }`]);
                    }
                    styleCache.runways.getText()!.setText(properties.identifier!);

                    return styleCache.runways;
                }
            }
        });
    }

    const newlySetAirports = new Set<string>();

    if (!styleFillCache.gateDefault) {
        styleFillCache.gateDefault = new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 0.5)`,
        });
    }

    if (!styleStrokeCache.gateDefault) {
        styleStrokeCache.gateDefault = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
        });
    }

    const airportsMap = Object.fromEntries(airports.map(airport => [airport.icao, airport.aircraft]));

    for (const icao in navigraphData) {
        const gates = navigraphData[icao]?.gates;
        const runways = navigraphData[icao]?.runways;

        if (!runways?.length && !gates?.length) continue;

        const pilots = [
            ...(airportsMap[icao]?.groundDep ?? []).map(x => dataStore.vatsim.data.keyedPilots.value[x]),
            ...(airportsMap[icao]?.groundArr ?? []).map(x => dataStore.vatsim.data.keyedPilots.value[x]),
        ] as VatsimShortenedAircraft[];

        const resolvedGates = gates ? getGatesMatch(gates, pilots) : [];

        for (const gate of resolvedGates) {
            const id = `airport-${ icao }-gate-${ gate.gate_identifier }` as const;
            const opacitySetting = store.mapSettings.colors?.[store.getCurrentTheme]?.gates;

            const color = gate.trulyOccupied ? `rgba(${ getCurrentThemeRgbColor('error700').join(',') }, ${ opacitySetting ?? 1 })` : gate.maybeOccupied ? `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, ${ opacitySetting ?? 1 })` : `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, ${ opacitySetting ?? 1 })`;

            const existingFeature = getMapFeature('airport-navigraph', source, id);

            if (existingFeature) {
                if (existingFeature.getProperties().gateColor !== color) {
                    existingFeature.setProperties({
                        gateColor: color,
                        trulyOccupied: gate.trulyOccupied,
                        maybeOccupied: gate.maybeOccupied,
                    });
                }
            }
            else {
                const feature = createMapFeature('airport-navigraph', {
                    id,
                    identifier: gate.name || gate.gate_identifier,
                    type: 'airport-navigraph',
                    geometry: new Point([gate.gate_longitude, gate.gate_latitude]),
                    gateColor: color,
                    airport: icao,
                    featureType: 'gate',
                    trulyOccupied: gate.trulyOccupied,
                    maybeOccupied: gate.maybeOccupied,
                });

                source.addFeature(feature);
            }
        }

        for (const runway of runways ?? []) {
            const id = `airport-${ icao }-runway-${ runway.runway_identifier }` as const;

            const existingFeature = getMapFeature('airport-navigraph', source, id);
            const color = getSelectedColorFromSettings('runways') || `rgba(${ getCurrentThemeRgbColor('error300').join(',') }, 0.7)`;

            if (existingFeature) {
                if (existingFeature.getProperties().gateColor !== color) {
                    existingFeature.setProperties({
                        gateColor: color,
                    });
                }
                continue;
            }
            else {
                const feature = createMapFeature('airport-navigraph', {
                    id,
                    type: 'airport-navigraph',
                    geometry: new Point([runway.runway_longitude, runway.runway_latitude]),
                    airport: icao,
                    featureType: 'runway',
                    gateColor: color,
                    identifier: runway.runway_identifier.replace('RW', ''),
                });

                source.addFeature(feature);
            }
        }

        setAirports.add(icao);
        newlySetAirports.add(icao);
    }
    for (const airport of [...setAirports]) {
        if (!newlySetAirports.has(airport)) {
            source.forEachFeature(feature => {
                if (feature.getProperties().airport === airport) {
                    source.removeFeature(feature);
                    feature.dispose();
                }
            });

            setAirports.delete(airport);
        }
    }
}
