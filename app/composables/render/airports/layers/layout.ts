import type VectorSource from 'ol/source/Vector.js';
import type VectorLayer from 'ol/layer/Vector.js';
import type { AirportListItem } from '~/composables/render/airports';
import type { AirportNavigraphData } from '~/components/map/layers/MapAirportsList.vue';
import { supportedNavigraphLayouts } from '~/utils/shared/vatsim';
import type { AmdbLayerName } from '@navigraph/amdb';
import type Feature from 'ol/Feature.js';
import type Geometry from 'ol/geom/Geometry.js';

const setAirports = new Set<string>();
const airportFeatures = new Map<string, Feature<Geometry>[]>();
let currentSettingsKey: string | undefined;

export function setMapNavigraphLayout({ source, airports, navigraphData, layer }: {
    source: VectorSource;
    layer: VectorLayer;
    airports: AirportListItem[];
    navigraphData: AirportNavigraphData;
}) {
    const store = useStore();

    if (!source.getFeatures().length) {
        for (const features of airportFeatures.values()) {
            for (const feature of features) feature.dispose();
        }

        setAirports.clear();
        airportFeatures.clear();
    }

    const newlySetAirports = new Set<string>();

    const supported = new Set<AmdbLayerName>(supportedNavigraphLayouts);

    const disabledTaxiways = store.mapSettings.navigraphLayers?.hideTaxiways;
    const disabledGates = store.mapSettings.navigraphLayers?.hideGateGuidance;
    const disabledRunways = store.mapSettings.navigraphLayers?.hideRunwayExit;
    const disabledDeicing = store.mapSettings.navigraphLayers?.hideDeicing;
    const settingsKey = [disabledTaxiways, disabledGates, disabledRunways, disabledDeicing].map(String).join(':');

    if (currentSettingsKey !== settingsKey) {
        for (const features of airportFeatures.values()) {
            for (const feature of features) {
                source.removeFeature(feature);
                feature.dispose();
            }
        }

        setAirports.clear();
        airportFeatures.clear();
        currentSettingsKey = settingsKey;
    }

    if (!disabledTaxiways) ['taxiwayelement', 'taxiwayholdingposition', 'taxiwayguidanceline', 'taxiwayintersectionmarking'].forEach(x => supported.add(x as AmdbLayerName));
    if (!disabledGates) supported.add('standguidanceline');
    if (!disabledRunways) supported.add('runwayexitline');
    if (!disabledDeicing) supported.add('deicingarea');

    for (const icao in navigraphData) {
        const layout = navigraphData[icao]?.layout;

        if (!layout) continue;

        if (!setAirports.has(icao)) {
            for (const [_key, value] of Object.entries(layout)) {
                const key = _key as AmdbLayerName;
                if (!supported.has(key)) continue;

                const features = geoJson.readFeatures(value, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:4326',
                }) as Feature<Geometry>[];

                for (const feature of features) {
                    feature.setProperties({
                        id: `airport-${ icao }-layer`,
                        type: key,
                        airport: icao,
                    });

                    source.addFeature(feature);
                }

                const existingFeatures = airportFeatures.get(icao);
                if (existingFeatures) existingFeatures.push(...features);
                else airportFeatures.set(icao, features);
            }
        }

        setAirports.add(icao);
        newlySetAirports.add(icao);
    }

    for (const airport of [...setAirports]) {
        if (!newlySetAirports.has(airport)) {
            for (const feature of airportFeatures.get(airport) ?? []) {
                source.removeFeature(feature);
                feature.dispose();
            }

            airportFeatures.delete(airport);
            setAirports.delete(airport);
        }
    }
}
