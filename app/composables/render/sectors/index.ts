import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type { MapFir } from '~/components/map/layers/MapSectorList.vue';
import { createDefaultStyle } from 'ol/style/Style.js';
import { setSectorStyle } from '~/composables/render/sectors/style';
import type { VatSpyDataFeature } from '~/types/data/vatspy';
import { vgFallbackKeys } from '~/composables/render/storage';
import {
    isVatGlassesActive,
} from '~/utils/data/vatglasses';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import type { FeatureSectorVG, FeatureAirportSectorDefaultProperties } from '~/utils/map/entities';

export function setMapSectors({ source, firs, layer, labelsSource, labelsLayer }: {
    source: VectorSource;
    layer: VectorLayer;

    labelsSource: VectorSource;
    labelsLayer: VectorLayer;

    firs: MapFir[];
}) {
    const store = useStore();
    const dataStore = useDataStore();

    if (layer.getStyle() === createDefaultStyle) {
        setSectorStyle(layer);
    }

    if (labelsLayer.getStyle() === createDefaultStyle) {
        setSectorStyle(labelsLayer, true);
    }

    const fallbackPositions = isVatGlassesActive.value && useDataStore().vatglassesActivePositions.value['fallback'] && vgFallbackKeys.value;
    const activeIds = new Set<string>();

    for (const fir of firs) {
        const firs: VatSpyDataFeature[] = [];
        const uirs: VatSpyDataFeature[] = [];

        fir.atc.forEach((x, index) => {
            if (!x.icao && x.controller && (!fallbackPositions || fallbackPositions.includes(x.controller.callsign) || x.controller.booking) && !firs.some((y, yIndex) => yIndex < index && y.controller.cid === x.controller.cid)) {
                firs.push(x);
            }
            else if (x.icao && x.controller && (!fallbackPositions || fallbackPositions.includes(x.controller.callsign) || x.controller.booking) && !uirs.some((y, yIndex) => yIndex < index && y.controller.cid === x.controller.cid)) {
                uirs.push(x);
            }
        });

        const controllers = firs.length ? firs : uirs;
        const sectorType: FeatureAirportSectorDefaultProperties['sectorType'] = controllers.length
            ? firs.length ? 'fir' : 'uir'
            : 'empty';

        const id: any = 'sector-' + String(fir.fir.icao) + String(fir.fir.callsign) + String(fir.fir.boundary) + String(sectorType);
        activeIds.add(id);

        const existingFeature = getMapFeature('sector', source, id);
        if (existingFeature) {
            existingFeature.setProperties({
                ...existingFeature.getProperties(),
                booked: store.bookingOverride || !!fir.booking,
                duplicated: !!controllers.length && controllers.every(x => x.controller.duplicated),
                atc: controllers.map(x => x.controller),
                icao: !firs.length ? uirs[0]?.icao ?? '' : fir.fir.icao,
                uir: uirs.length ? (firs.length ? uirs[0]?.icao : fir.fir.icao) : undefined,
            });
        }
        else {
            const geometry = geoJson.readGeometry(fir.fir.feature.geometry) as any;

            const feature = createMapFeature('sector', {
                geometry,
                type: 'sector',
                id,
                sectorType,
                booked: store.bookingOverride || !!fir.booking,
                label: [fir.fir.lon, fir.fir.lat],
                duplicated: !!controllers.length && controllers.every(x => x.controller.duplicated),
                atc: controllers.map(x => x.controller),
                icao: !firs.length ? uirs[0]?.icao ?? '' : fir.fir.icao,
                uir: uirs.length ? (firs.length ? uirs[0]?.icao : fir.fir.icao) : undefined,
                name: (!firs.length && uirs.length) ? (uirs[0].name ?? fir.fir.name) : fir.fir.name,
                isOceanic: fir.fir.isOceanic,
            });
            source.addFeature(feature);
            labelsSource.addFeature(feature);
        }
    }

    if (isVatGlassesActive.value && !store.bookingOverride) {
        const features = source.getFeatures().slice(0) as FeatureSectorVG[];

        const vgMap: Record<string, FeatureSectorVG[]> = {};

        for (const feature of features) {
            const properties = feature.getProperties();
            if (!isMapFeature('sector-vatglasses', properties)) continue;
            vgMap[properties.vgSectorId] ??= [];
            vgMap[properties.vgSectorId].push(feature);
        }

        const lastLevelOrCombined = store.mapSettings.vatglasses?.combined ? true : store.localSettings.vatglassesLevel ?? 999;

        for (const countryId in dataStore.vatglassesActivePositions.value) {
            const countryEntries = dataStore.vatglassesActivePositions.value[countryId];
            for (const positionId in countryEntries) {
                const position = countryEntries[positionId];
                const id: any = 'sector-' + String(countryId) + String(positionId) + String(store.mapSettings.vatglasses?.combined);
                activeIds.add(id);
                const existingFeatures = vgMap[id];

                const vgFeatures = store.mapSettings.vatglasses?.combined
                    ? position.sectorsCombined
                    : position.sectors?.filter(
                        x => x.properties?.min <= (store.localSettings.vatglassesLevel ?? 999) && x.properties?.max >= (store.localSettings.vatglassesLevel ?? 0),
                    );

                if (!existingFeatures?.length || existingFeatures.length !== vgFeatures?.length || !existingFeatures.every(x => x.getProperties().lastLevelOrCombined === lastLevelOrCombined)) {
                    const features = vgFeatures?.map(x => createMapFeature('sector-vatglasses', {
                        geometry: geoJson.readGeometry(x.geometry) as any,
                        type: 'sector-vatglasses',
                        sectorType: 'vatglasses',
                        vgSectorId: id,
                        min: x.properties.min,
                        max: x.properties.max,
                        countryGroupId: countryId,
                        positionId,
                        colour: x.properties.colour,
                        atc: position.atc,
                        lastLevelOrCombined,
                    }));

                    existingFeatures?.forEach(x => {
                        source.removeFeature(x);
                        labelsSource.removeFeature(x);
                        x.dispose();
                    });

                    features?.forEach(x => {
                        source.addFeature(x);
                        labelsSource.addFeature(x);
                    });
                }
                else {
                    existingFeatures.forEach(x => x.setProperties({
                        ...x.getProperties(),
                        atc: position.atc,
                    }));
                }
            }
        }
    }

    const features = [
        ...source.getFeatures().slice(0),
        ...labelsSource.getFeatures().slice(0),
    ];

    for (const feature of features) {
        const properties = feature.getProperties();

        if ((isMapFeature('sector', properties) && !activeIds.has(properties.id)) || (isMapFeature('sector-vatglasses', properties) && !activeIds.has(properties.vgSectorId))) {
            source.removeFeature(feature);
            labelsSource.removeFeature(feature);
            feature.dispose();
        }
    }
}
