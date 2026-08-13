import { combineSectors, splitSectors } from '~/utils/data/vatglasses-helper';
import type { Feature as TurfFeature, Polygon as TurfPolygon } from 'geojson';
import type { VatglassesSectorProperties } from '~/utils/data/vatglasses';

interface CombinationWorkerRequest {
    type: 'splitAndCombineSectors';
    sectors: TurfFeature<TurfPolygon, VatglassesSectorProperties>[];
}

self.onmessage = function(event: MessageEvent<CombinationWorkerRequest>) {
    if (event.data.type !== 'splitAndCombineSectors') return;

    const split = splitSectors(event.data.sectors) as TurfFeature<TurfPolygon, VatglassesSectorProperties>[];
    self.postMessage(combineSectors(split));
};
