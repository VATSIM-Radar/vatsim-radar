import { layers, namedFlavor } from '@protomaps/basemaps';
import VectorTileLayer from 'ol/layer/VectorTile';
import { applyStyle } from 'ol-mapbox-style';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { buildAttributions } from '~/composables/map';

export async function getProtomapsLayer({ theme, isLabels, isDetailed: isDetailedTheme }: {
    theme: 'dark' | 'light' | 'grayscale' | 'black' | 'white';
    isLabels: boolean;
    isDetailed?: boolean;
}) {
    const glStyle = {
        version: 8,
        glyphs: 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
        sources: {
            protomaps: {
                type: 'vector',
                url: '/tiles.json?v=2.0.3.1',
            },
        },
        layers: layers('protomaps', namedFlavor(theme), { lang: isLabels ? 'en' : undefined }),
    };

    const tileLayer = new VectorTileLayer({
        declutter: 'pm',
        updateWhileAnimating: false,
        updateWhileInteracting: false,
        renderMode: 'hybrid',
        zIndex: 0,
        cacheSize: 32,
        // @ts-expect-error wrong types
        renderOrder: null,
    });

    const isDetailed = isDetailedTheme ?? (theme === 'light' || theme === 'dark');

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

    await applyStyle(tileLayer, glStyle);

    const attributionLayer = new TileLayer({
        source: new XYZ({
            attributions: buildAttributions('Protomaps', 'https://github.com/protomaps/basemaps'),
        }),
        zIndex: 0,
    });

    return {
        tileLayer,
        attributionLayer,
    };
}
