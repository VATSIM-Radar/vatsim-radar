import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import { createDefaultStyle } from 'ol/style/Style.js';
import { setSectorStyle } from '~/composables/render/sectors/style';
import {
    isVatGlassesActive,
} from '~/utils/data/vatglasses';
import { createMapFeature, getMapFeature, isMapFeature } from '~/utils/map/entities';
import type { FeatureSectorVG, FeatureAirportSectorDefaultProperties } from '~/utils/map/entities';
import type VectorImageLayer from 'ol/layer/VectorImage';

export function setMapSectors({ source, firs, layer, emptyLayer, emptySource, labelsLayer }: {
    source: VectorSource;
    layer: VectorLayer;

    emptySource: VectorSource;
    emptyLayer: VectorImageLayer;

    labelsLayer: VectorLayer;

    firs: DataSector[];
}) {
    const store = useStore();
    const dataStore = useDataStore();

    if (layer.getStyle() === createDefaultStyle) {
        setSectorStyle(layer);
    }

    if (emptyLayer.getStyle() === createDefaultStyle) {
        setSectorStyle(emptyLayer);
    }

    if (labelsLayer.getStyle() === createDefaultStyle) {
        setSectorStyle(labelsLayer, true);
    }

    const activeIds = new Set<string>();
    const emptyIds = new Set<string>();

    for (const fir of firs) {
        const controllers = fir.atc;
        const sectorType: FeatureAirportSectorDefaultProperties['sectorType'] = controllers.length
            ? (fir.uir && !fir.uirWithFir) ? 'uir' : 'fir'
            : 'empty';

        const id: any = 'sector-' + String(fir.fir?.icao) + String(fir.fir?.callsign) + String(fir.feature.properties.id) + String(sectorType);
        if (sectorType === 'empty') emptyIds.add(id);
        else activeIds.add(id);

        const existingFeature = getMapFeature('sector', sectorType === 'empty' ? emptySource : source, id);
        const isBooking = store.bookingOverride || (!!controllers.length && controllers.every(x => x.booking));
        const isDuplicated = !!controllers.length && controllers.every(x => x.duplicated);

        let icao = fir.uir?.icao ?? fir.fir?.icao ?? fir.feature.properties.id;
        let uir = fir.uir
            ? fir.fir?.icao ?? fir.feature.properties.id
            : undefined;
        let name = fir.uir?.name ?? fir.fir?.name ?? fir.feature.properties.id;

        if (fir.uirWithFir) {
            icao = fir.fir?.icao ?? fir.feature.properties.id;
            uir = fir.uir?.icao;
            name = fir.fir?.name ?? fir.feature.properties.id;
        }

        if (existingFeature) {
            if (sectorType === 'empty') continue;
            existingFeature.setProperties({
                sectorType,
                booked: isBooking,
                duplicated: isDuplicated,
                atc: controllers,
                icao,
                uir,
                name,
            });
        }
        else {
            const geometry = geoJson.readGeometry(fir.feature.geometry) as any;

            const feature = createMapFeature('sector', {
                geometry,
                type: 'sector',
                id,
                sectorType,
                booked: isBooking,
                label: fir.feature.properties.label,
                duplicated: isDuplicated,
                atc: controllers,
                icao,
                uir,
                name,
                isOceanic: fir.feature.properties.oceanic,
            });
            (sectorType === 'empty' ? emptySource : source).addFeature(feature);
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
                        x.dispose();
                    });

                    features?.forEach(x => {
                        source.addFeature(x);
                    });
                }
                else {
                    existingFeatures.forEach(x => x.setProperties({
                        atc: position.atc,
                        lastLevelOrCombined,
                    }));
                }
            }
        }
    }

    const features = source.getFeatures().slice(0);

    for (const feature of features) {
        const properties = feature.getProperties();

        if ((isMapFeature('sector', properties) && !activeIds.has(properties.id)) || (isMapFeature('sector-vatglasses', properties) && !activeIds.has(properties.vgSectorId))) {
            source.removeFeature(feature);
            feature.dispose();
        }
    }

    const emptyFeatures = emptySource.getFeatures().slice(0);

    for (const feature of emptyFeatures) {
        const properties = feature.getProperties();

        if (isMapFeature('sector', properties) && !emptyIds.has(properties.id)) {
            source.removeFeature(feature);
            feature.dispose();
        }
    }
}
