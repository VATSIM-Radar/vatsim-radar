import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type { AirportListItem } from '~/composables/render/airports';
import type { AirportNavigraphData } from '~/components/map/airports/MapAirportsListV2.vue';
import { getCurrentThemeRgbColor } from '~/composables';
import type { Fill, Stroke } from 'ol/style';
import { Style, Text } from 'ol/style';
import { toRadians } from 'ol/math';
import { Point } from 'ol/geom';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import { getSelectedColorFromSettings } from '~/composables/settings/colors';
import { checkIsPilotInGate, supportedNavigraphLayouts } from '~/utils/shared/vatsim';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { AmdbLayerName } from '@navigraph/amdb';

const setAirports = new Set<string>();

const styleFillCache: Record<string, Fill> = {};
const styleStrokeCache: Record<string, Stroke> = {};

export function setMapNavigraphLayout({ source, airports, navigraphData, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
    navigraphData: AirportNavigraphData;
}) {
    const store = useStore();

    const newlySetAirports = new Set<string>();

    const supported = supportedNavigraphLayouts.slice(0);

    const disabledTaxiways = store.mapSettings.navigraphLayers?.hideTaxiways;
    const disabledGates = store.mapSettings.navigraphLayers?.hideGateGuidance;
    const disabledRunways = store.mapSettings.navigraphLayers?.hideRunwayExit;
    const disabledDeicing = store.mapSettings.navigraphLayers?.hideDeicing;

    if (!disabledTaxiways) supported.push('taxiwayelement', 'taxiwayholdingposition', 'taxiwayguidanceline', 'taxiwayintersectionmarking');
    if (!disabledGates) supported.push('standguidanceline');
    if (!disabledRunways) supported.push('runwayexitline');
    if (!disabledDeicing) supported.push('deicingarea');

    for (const icao in navigraphData) {
        const layout = navigraphData[icao]?.layout;

        if (!layout) continue;

        if (!setAirports.has(icao)) {
            for (const [_key, value] of Object.entries(layout)) {
                const key = _key as AmdbLayerName;
                if (!supported.includes(key)) continue;

                const features = geoJson.readFeatures(value, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:4326',
                });

                for (const feature of features) {
                    feature.setProperties({
                        ...feature.getProperties(),
                        id: `airport-${ icao }-layer`,
                        type: key,
                        airport: icao,
                    });

                    source.addFeature(feature);
                }
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
