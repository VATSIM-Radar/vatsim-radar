import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type { MapFir } from '~/components/map/sectors/MapSectorListV2.vue';
import { createDefaultStyle } from 'ol/style/Style.js';
import { setSectorStyle } from '~/composables/render/sectors/style';

export function setMapSectors({ source, firs, layer}: {
    source: VectorSource;
    layer: VectorLayer;
    firs: MapFir[];
}) {
    if (layer.getStyle() === createDefaultStyle) {
        setSectorStyle(layer);
    }
}
