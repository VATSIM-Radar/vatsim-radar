import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type { AirportListItem } from '~/composables/render/airports';
import type { AirportNavigraphData } from '~/components/map/airports/MapAirportsListV2.vue';
import { getCurrentThemeRgbColor } from '~/composables';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { toRadians } from 'ol/math';
import { Point } from 'ol/geom';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';
import { checkIsPilotInGate } from '~/utils/shared/vatsim';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';

const setAirports = new Set<string>();

const styleFillCache: Record<string, Fill> = {};
const styleStrokeCache: Record<string, Stroke> = {};

export function setMapGatesRunways({ source, airports, navigraphData, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
    navigraphData: AirportNavigraphData;
}) {
    const store = useStore();

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

    const airportsMap = Object.fromEntries(airports.map(airport => [airport.airport.icao, airport.aircraft]));

    for (const icao in navigraphData) {
        const gates = navigraphData[icao]?.gates;
        const runways = navigraphData[icao]?.runways;

        if (!runways?.length && !gates?.length) continue;

        for (const pilot of [...airportsMap[icao]?.groundDep ?? [], ...airportsMap[icao]?.groundArr ?? []] as VatsimShortenedAircraft[]) {
            checkIsPilotInGate(pilot, gates);
        }

        for (const gate of gates ?? []) {
            const id = `airport-${ icao }-gate-${ gate.gate_identifier }` as const;
            const opacitySetting = store.mapSettings.colors?.[store.getCurrentTheme]?.gates;

            const color = gate.trulyOccupied ? `rgba(${ getCurrentThemeRgbColor('error700').join(',') }, ${ opacitySetting ?? 1 })` : gate.maybeOccupied ? `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, ${ opacitySetting ?? 1 })` : `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, ${ opacitySetting ?? 1 })`;
            if (!styleFillCache[`gate${ color }`]) {
                styleFillCache[`gate${ color }`] = new Fill({
                    color,
                });
            }

            const existingFeature = getMapFeature('airport-navigraph', source, id);

            if (existingFeature) {
                const style = existingFeature.getStyle() as Style;
                if (style.getText()?.getFill()?.getColor() !== color) {
                    existingFeature.setStyle(new Style({
                        text: new Text({
                            font: '11px LibreFranklin',
                            text: gate.name || gate.gate_identifier,
                            textAlign: 'center',
                            fill: styleFillCache[`gate${ color }`],
                            backgroundFill: styleFillCache.gateDefault,
                            backgroundStroke: styleStrokeCache.gateDefault,
                            rotation: toRadians(0),
                            padding: [2, 0, 2, 2],
                        }),
                        zIndex: gate.trulyOccupied ? 2 : gate.maybeOccupied ? 1 : 0,
                    }));
                }
            }
            else {
                const feature = createMapFeature('airport-navigraph', {
                    id,
                    identifier: gate.name || gate.gate_identifier,
                    type: 'airport-navigraph',
                    geometry: new Point([gate.gate_longitude, gate.gate_latitude]),
                    airport: icao,
                });

                feature.setStyle(new Style({
                    text: new Text({
                        font: getTextFont('caption-light'),
                        text: gate.name || gate.gate_identifier,
                        textAlign: 'center',
                        fill: styleFillCache[`gate${ color }`],
                        backgroundFill: styleFillCache.gateDefault,
                        backgroundStroke: styleStrokeCache.gateDefault,
                        rotation: toRadians(0),
                        padding: [2, 0, 1, 2],
                    }),
                    zIndex: gate.trulyOccupied ? 2 : gate.maybeOccupied ? 1 : 0,
                }));

                source.addFeature(feature);
            }
        }

        for (const runway of runways ?? []) {
            const id = `airport-${ icao }-runway-${ runway.runway_identifier }` as const;

            const existingFeature = getMapFeature('airport-navigraph', source, id);
            const color = getSelectedColorFromSettings('runways') || `rgba(${ getCurrentThemeRgbColor('error300').join(',') }, 0.7)`;

            if (!styleFillCache[`runway${ color }`]) {
                styleFillCache[`runway${ color }`] = new Fill({
                    color,
                });
            }

            if (existingFeature) continue;
            else {
                const feature = createMapFeature('airport-navigraph', {
                    id,
                    type: 'airport-navigraph',
                    geometry: new Point([runway.runway_longitude, runway.runway_latitude]),
                    airport: icao,
                });

                feature.setStyle(new Style({
                    text: new Text({
                        font: 'bold 12px LibreFranklin',
                        text: runway.runway_identifier.replace('RW', ''),
                        rotation: toRadians(runway.runway_true_bearing),
                        rotateWithView: true,
                        fill: styleFillCache[`runway${ color }`],
                    }),
                }));

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
