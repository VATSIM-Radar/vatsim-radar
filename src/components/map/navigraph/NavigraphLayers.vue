<template>
    <div class="layers"/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Point } from 'ol/geom';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { getCurrentThemeRgbColor } from '~/composables';

let ndbSource: VectorSource | undefined;
let ndbLayer: VectorLayer<any> | undefined;

const ndbEnabled = ref(true);

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();

function initNDB() {
    if (ndbEnabled.value) {
        if (!ndbLayer) {
            ndbLayer = new VectorLayer<any>({
                source: ndbSource = new VectorSource(),
                zIndex: 7,
                minZoom: 7,
                declutter: true,
                properties: {
                    type: 'navigraph',
                },
                style: function(feature) {
                    const properties = feature.getProperties();

                    if (properties.isVHF) {
                        return new Style({
                            image: new Circle({
                                radius: 5,
                                stroke: new Stroke({
                                    color: `rgba(${ getCurrentThemeRgbColor('primary500').join(',') }, 0.6)`,
                                    width: 2,
                                }),
                            }),
                            text: new Text({
                                font: '8px Montserrat',
                                text: `${ properties.name }\nVORDME ${ properties.frequency } ${ properties.code }`,
                                offsetX: 10,
                                offsetY: 2,
                                textAlign: 'left',
                                justify: 'center',
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.6)`,
                                }),
                            }),
                        });
                    }

                    return new Style({
                        image: new Circle({
                            radius: 5,
                            stroke: new Stroke({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.6)`,
                                width: 2,
                            }),
                        }),
                        text: new Text({
                            font: '8px Montserrat',
                            text: `${ properties.name }\nNDB ${ properties.frequency } ${ properties.code }`,
                            offsetX: 10,
                            offsetY: 2,
                            textAlign: 'left',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.6)`,
                            }),
                        }),
                    });
                },
            });
        }

        ndbSource?.clear();

        ndbSource?.addFeatures(Object.values(dataStore.navigraph.data.value!.vhf).map(([name, code, frequency, longitude, latitude]) => new Feature({
            geometry: new Point([longitude, latitude]),
            name,
            code,
            frequency,
            isVHF: true,
        })));

        ndbSource?.addFeatures(Object.values(dataStore.navigraph.data.value!.ndb).map(([name, code, frequency, longitude, latitude]) => new Feature({
            geometry: new Point([longitude, latitude]),
            name,
            code,
            frequency,
        })));

        map.value?.addLayer(ndbLayer);
    }
    else {
        if (ndbLayer) {
            map.value?.removeLayer(ndbLayer);
        }
        ndbLayer?.dispose();
    }
}

watch(map, val => {
    if (!val) return;

    initNDB();
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (ndbLayer) {
        map.value?.removeLayer(ndbLayer);
    }
    ndbLayer?.dispose();
});
</script>

<style scoped lang="scss">
.layers {

}
</style>
