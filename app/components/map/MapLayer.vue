<script setup lang="ts">
import { useStore } from '~/store';
import type { MapLayoutLayerExternal } from '~/types/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile.js';
import type { TileJSON } from 'ol/source.js';
import { XYZ } from 'ol/source.js';
import type { PartialRecord } from '~/types';
import { applyStyle } from 'ol-mapbox-style';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorSource from 'ol/source/Vector.js';
import { Fill, Style } from 'ol/style.js';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import { isProductionMode } from '~/utils/shared';
import { layers, namedFlavor } from '@protomaps/basemaps';

import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { buildAttributions } from '~/composables/map';

const store = useStore();

interface Layer {
    attribution?: {
        title: string;
        url: string;
    };
    size?: number;
    url: string;
    lightThemeUrl?: string;
    vector?: false;
    pm?: false;
}

type IVectorLayer = Pick<Layer, 'attribution' | 'url' | 'lightThemeUrl'> & {
    vector: true;
    pm?: false;
};

type IPMLayer = Pick<Layer, 'attribution' | 'url' | 'lightThemeUrl'> & {
    pm: true;
    vector?: false;
    theme: 'black' | 'dark' | 'grayscale' | 'light' | 'white';
};

const externalLayers: PartialRecord<MapLayoutLayerExternal, Layer | IVectorLayer> = {
    Satellite: {
        url: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}`,
        attribution: {
            title: 'USGS',
            url: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
        },
    },
    SatelliteEsri: {
        url: `/layers/esri/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=AAPTxy8BH1VEsoebNVZXo8HurDMQfxZXP-jwqkEIQ3jLIZoTUg5nKRlVTBwkT6rjROYxXw0nv2RYA5yv6hZBods45S-mobzoAHIy4R8ZP_kadIqOrU5bJTyqic63SPSS8-EeC1qFvTOFBd2sQtynCOUMdk4YWCR7Jj7C85_hfBAYvFj9lI1jEmCNzQJqyoitGPjNwW-efZ318KR2nhYadO4TEDqT9D53FlaDZffQjSMeKD8.AT1_chWUHHAZ`,
    },
    OSM: {
        attribution: {
            title: 'OpenStreetMaps',
            url: 'https://openstreetmap.org/',
        },
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
};

/* enum InternalThemes {
    darkSatelliteL = 'clxpxzi3300ld01qqb343fuv8',
    darkSatelliteNL = 'clxpygplc00my01qwasza7aft',
    darkL = 'clxpvwey9006j01r08g6fdwtp',
    darkNL = 'clxpxxj6w00lc01qqh0dc2d4i',

    lightSatelliteL = 'clxpysco700n001qw2a9u61ar',
    lightSatelliteNL = 'clxpyxm4700nk01pc3nttg9g4',
    lightL = 'clxpypp7d00mz01qwe0gefqi7',
    lightNL = 'clxpykjoh00nj01pcgmrudq8q',
}*/

const isLabels = computed(() => store.localSettings.filters?.layers?.layerLabels ?? true);

const route = useRoute();

const layer = computed<Layer | IVectorLayer | IPMLayer>(() => {
    if (route.path.startsWith('/data') && route.path.endsWith('/compare')) {
        return {
            url: 'basic',
        };
    }

    let layer = store.localSettings.filters?.layers?.layer ?? 'protoData';

    if (layer === 'OSM' && store.theme !== 'light') layer = 'protoGeneral';

    if (layer === 'SatelliteEsri' && isProductionMode()) {
        layer = 'protoData';
        setUserLocalSettings({
            filters: {
                layers: {
                    layer: 'protoData',
                },
            },
        });
    }

    if (layer === 'basic') {
        return {
            url: 'basic',
        };
    }

    if (!(layer in externalLayers)) {
        const isGeneral = layer === 'protoGeneral';
        const isGrayscale = store.getCurrentTheme === 'default' ? false : store.localSettings.filters?.layers?.layer === 'protoDataGray';

        let theme: IPMLayer['theme'];

        if (isGeneral) {
            theme = store.getCurrentTheme === 'default' ? 'dark' : 'light';
        }
        else if (isGrayscale) {
            theme = 'grayscale';
        }
        else {
            theme = store.getCurrentTheme === 'default' ? 'black' : 'white';
        }

        return {
            attribution: {
                title: 'Protomaps',
                url: 'https://github.com/protomaps/basemaps',
            },
            url: '/tiles.json',
            pm: true,
            theme,
        };
    }

    const external = externalLayers[layer as MapLayoutLayerExternal]!;

    if (layer === 'Satellite' && isLabels.value) {
        return {
            ...external,
            url: external.url.replace('USGSImageryOnly', 'USGSImageryTopo'),
        };
    }

    return external;
});
const layerUrl = computed(() => layer.value.url + layer.value.lightThemeUrl + ('theme' in layer.value ? layer.value.theme : ''));

const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));

const opacity = computed(() => {
    switch (store.localSettings.filters?.layers?.layer) {
        case 'OSM':
            return store.localSettings.filters.layers.transparencySettings?.osm || 0.5;
        case 'Satellite':
        case 'SatelliteEsri':
            return store.localSettings.filters.layers.transparencySettings?.satellite || 0.3;
        default:
            return 1;
    }
});

const theme = computed(() => store.theme);

const map = inject<ShallowRef<Map | null>>('map')!;
const tileLayer = shallowRef<TileLayer<XYZ | TileJSON> | VectorTileLayer | null>();
let attributionLayer: TileLayer<XYZ> | null = null;

useHead(() => ({
    htmlAttrs: {
        class: {
            '--dark-matter-vector': tileLayer.value instanceof VectorTileLayer && store.getCurrentTheme !== 'light',
            '--positron-vector': tileLayer.value instanceof VectorTileLayer && store.getCurrentTheme === 'light',
            '--basic-layer': layerUrl.value.startsWith('basic'),
        },
    },
}));

const allowedLayers = /^(?!roadname)(background|landcover|boundary|water|aeroway|road|rail|bridge|building|place)/;

let mapSource: VectorSource | undefined;
let mapLayer: VectorImageLayer | undefined;
let style: Style | undefined;

async function initLayer() {
    if (tileLayer.value) map.value?.removeLayer(tileLayer.value);
    tileLayer.value?.dispose();

    if (attributionLayer) map.value?.removeLayer(attributionLayer);
    attributionLayer?.dispose();

    if (mapLayer) map.value?.removeLayer(mapLayer);
    mapLayer?.dispose();

    if (layer.value.url === 'basic') {
        const continents = (await import('@/assets/continents.json')).default;

        if (mapSource) {
            mapSource.clear();
        }
        else mapSource = new VectorSource();

        style ??= new Style({
            fill: new Fill({
                color: getCurrentThemeHexColor('darkgray1000'),
            }),
        });

        mapLayer = new VectorImageLayer({
            source: mapSource,
            style,
            zIndex: 0,
            imageRatio: store.isTouch ? 1 : 2,
        });

        mapSource.addFeatures(geoJson.readFeatures(continents));

        map.value?.addLayer(mapLayer);

        return;
    }

    if (layer.value.vector) {
        tileLayer.value = new VectorTileLayer({
            declutter: true,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            renderMode: 'hybrid',
            zIndex: 0,
            cacheSize: 32,
        });

        const url = store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url;
        const json = await $fetch<Record<string, any>>(store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url);
        json.id = url;

        if (json.layers) {
            json.layers = json.layers.filter((layer: Record<string, any>) => allowedLayers.test(layer.id));
        }

        await applyStyle(tileLayer.value, json);

        map.value?.addLayer(tileLayer.value);
        attributionLayer = new TileLayer({
            source: new XYZ({
                attributions: buildAttributions(false, ''),
            }),
        });
        map.value?.addLayer(attributionLayer);

        return;
    }

    if (layer.value.pm) {
        const glStyle = {
            version: 8,
            glyphs: 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
            sources: {
                protomaps: {
                    type: 'vector',
                    url: layer.value.url,
                },
            },
            layers: layers('protomaps', namedFlavor(layer.value.theme), { lang: isLabels.value ? 'en' : undefined }),
        };

        tileLayer.value = new VectorTileLayer({
            declutter: true,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            renderMode: 'hybrid',
            zIndex: 0,
            cacheSize: 32,
        });

        const isDetailed = layer.value.theme === 'light' || layer.value.theme === 'dark';

        const excludedLayers = [
            'roads_labels_minor',
            'roads_labels_major',
            'water_waterway_label',
            'landuse_park',
            'landuse_zoo',
            'address_label',
            'roads_other',
            'pois',
        ];

        const excludedRegex: RegExp[] = [
            /roads_tunnels/,
            /roads_bridges_(?!(major|highway))/,
        ];

        if (!isDetailed) {
            excludedLayers.push(
                'landuse_urban_green',
                'landuse_hospital',
                'landuse_industrial',
                'landuse_school',
                'landuse_beach',
                'water_river',
                'landuse_pedestrian',
                'landuse_pier',
                'places_subplace',
                'places_locality',
                'buildings',
                'water_label_lakes',
                'roads_shields',
                'roads_oneway',
            );

            excludedRegex.push(
                /roads_minor/,
                /roads_major/,
                /boundaries/,
            );
        }


        glStyle.layers = glStyle.layers.filter((layer: Record<string, any>) => !excludedLayers.includes(layer.id) && !excludedRegex.some(x => x.test(layer.id)));

        await applyStyle(tileLayer.value, glStyle);

        attributionLayer = new TileLayer({
            source: new XYZ({
                attributions: buildAttributions(layer.value.attribution?.title || false, layer.value.attribution?.url ?? ''),
            }),
        });
        map.value?.addLayer(attributionLayer);
        map.value?.addLayer(tileLayer.value);

        return;
    }

    tileLayer.value = new TileLayer({
        source: new XYZ({
            attributions: layer.value.attribution ? buildAttributions(layer.value.attribution.title, layer.value.attribution.url) : undefined,
            url: store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url,
            wrapX: true,
            tileSize: layer.value.size ?? 256,
        }),
        opacity: opacity.value,
        zIndex: 0,
        cacheSize: 32,
    });
    map.value?.addLayer(tileLayer.value);
}

watch(map, val => {
    if (!val) return;

    initLayer();
}, {
    immediate: true,
});

const vatglassesEnabled = isVatGlassesActive;

watch([layerUrl, theme, vatglassesEnabled, transparencySettings, isLabels], initLayer);

onBeforeUnmount(() => {
    if (tileLayer.value) map.value?.removeLayer(tileLayer.value);
    if (mapLayer) map.value?.removeLayer(mapLayer);
});
</script>

<style lang="scss">
.--dark-matter-vector .app_content > .map {
    background: $darkgray900;
}

.--positron-vector .app_content > .map {
    background: rgb(253, 253, 250);
}

.--basic-layer .app_content > .map {
    background: $darkgray850;
}
</style>
