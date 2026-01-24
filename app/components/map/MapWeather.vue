<script setup lang="ts">
import { useStore } from '~/store';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile.js';
import { XYZ } from 'ol/source.js';
import type { UrlFunction } from 'ol/Tile.js';
import type { MapWeatherLayer } from '~/types/map';

const store = useStore();

const weather = computed(() => {
    const item = store.localSettings.filters?.layers?.weather2;
    if (!item || String(item) === 'false') return null;

    return item;
});

const map = inject<ShallowRef<Map | null>>('map')!;
let tileLayer: TileLayer<XYZ> | undefined;
const timestamp = ref(0);

async function loadTimestamp() {
    timestamp.value = (await $fetch<number[]>('https://tilecache.rainviewer.com/api/maps.json'))[0];
}

interface Layer {
    attributions?: string;
    minZoom?: number;
    maxZoom?: number;
    tileUrlFunction: UrlFunction;
}

function getLayer(id: MapWeatherLayer): Layer {
    if (id === 'rainViewer') {
        return {
            attributions: '© <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a>',
            tileUrlFunction: coord => `https://tilecache.rainviewer.com/v2/radar/${ timestamp.value }/256/${ coord[0] }/${ coord[1] }/${ coord[2] }/3/1_1.png`,
            maxZoom: 10,
        };
    }

    if (id === 'PR0') {
        const now = new Date();
        const roundedMinutes = Math.floor(now.getMinutes() / 10) * 10;
        now.setMinutes(roundedMinutes - 10, 0, 0);

        return {
            minZoom: 3,
            maxZoom: 7,
            tileUrlFunction: coord => `https://maps.openweathermap.org/maps/2.0/radar/${ coord[0] }/${ coord[1] }/${ coord[2] }?appid=a1d03b5fa17676270ee45e3b2b29bebb&tm=${ now.getTime() / 1000 }`,
        };
    }

    if (id === 'RE') {
        return {
            tileUrlFunction: coord => `https://maps.openweathermap.org/maps/2.0/relief/${ coord[0] }/${ coord[1] }/${ coord[2] }?appid=a1d03b5fa17676270ee45e3b2b29bebb`,
        };
    }

    if (id === 'PR0C') id = 'PR0';

    let url = `https://maps.openweathermap.org/maps/2.0/weather/{op}/{z}/{x}/{y}?appid=a1d03b5fa17676270ee45e3b2b29bebb&opacity=1`;
    if (id === 'CL' && store.theme === 'light') {
        url += `&palette=0:00000000; 10:00000019; 20:00000026; 30:00000033; 40:0000004C; 50:00000066; 60:0000008C; 70:000000BF; 80:000000CC; 90:000000D8; 100:000000FF; 200:000000FF`;
    }

    if (id === 'WND' && store.theme === 'default') {
        url += `&palette=1:FFFFE0A3; 5:FFDAD3A3; 15:FFB58CF4; 25:8672F5CC; 50:A082F7E6; 100:7D51FFFF; 200:595A8FFF`;
    }

    return {
        tileUrlFunction: coord => {
            let uri = url;
            uri = uri
                .replace('{z}', coord[0].toString())
                .replace('{x}', coord[1].toString())
                .replace('{y}', coord[2].toString())
                .replace('{op}', id);

            return uri;
        },
    };
}

async function initLayer() {
    if (weather.value === 'rainViewer') await loadTimestamp();

    if (tileLayer) {
        map.value?.removeLayer(tileLayer);
        tileLayer?.dispose();
        tileLayer = undefined;
    }

    if (weather.value) {
        let opacity = weather.value === 'CL' ? 0.3 : store.theme === 'light' ? weather.value === 'rainViewer' ? 0.5 : 0.6 : 0.4;
        const transparency = store.localSettings.filters?.layers?.transparencySettings?.[store.theme === 'light' ? 'weatherLight' : 'weatherDark'];
        if (typeof transparency === 'number') opacity = transparency;

        tileLayer = new TileLayer({
            source: new XYZ({
                ...getLayer(weather.value),
                wrapX: true,
                tileSize: 256,
            }),
            opacity,
            zIndex: 1,
        });
        map.value?.addLayer(tileLayer);
    }
}

watch(map, val => {
    if (!val) return;

    initLayer();
}, {
    immediate: true,
});

watch(weather, initLayer);
const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));
watch(transparencySettings, initLayer);

let interval: NodeJS.Timeout | undefined;

onMounted(async () => {
    interval = setInterval(() => {
        initLayer();
    }, 1000 * 60 * 5);
});

onBeforeUnmount(() => {
    if (tileLayer) map.value?.removeLayer(tileLayer);
    clearInterval(interval);
});
</script>
