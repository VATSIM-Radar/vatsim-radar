<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import type { Sigmet, Sigmets } from '~/utils/server/storage';
import VectorSource from 'ol/source/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import { Fill, Stroke, Style, Text } from 'ol/style.js';
import type { ColorsListRgb } from '~/utils/colors';
import { getCurrentThemeRgbColor, getSigmetType } from '~/composables';
import { useStore } from '~/store';
import { useRadarError } from '~/composables/errors';

defineOptions({
    render: () => null,
});

const store = useStore();
const dataStore = useDataStore();
let initialCall = false;

const { refresh, data } = await useAsyncData<Sigmets>('sigmets', () => {
    try {
        let url = '/api/data/sigmets';
        const activeDate = store.localSettings.filters?.layers?.sigmets?.activeDate;

        const lastDate = initialCall && data.value?.validUntil;
        initialCall = true;

        if (activeDate && activeDate !== 'current') url += `?date=${ activeDate }${ lastDate ? `&lastDate=${ lastDate }` : '' }`;

        return $fetch<Sigmets>(url);
    }
    catch (e) {
        useRadarError(e);
        throw e;
    }
}, {
    server: false,
});

const isExpired = computed(() => {
    return data.value?.validUntil && data.value.validUntil < dataStore.time.value;
});

watchEffect(() => {
    if (data.value?.validUntil) {
        console.log(`Sigmets valid until ${ new Date(data.value?.validUntil).toISOString() }`);
    }
});

const shouldSetCurrent = computed(() => {
    return store.localSettings.filters?.layers?.sigmets?.activeDate && store.localSettings.filters?.layers?.sigmets?.activeDate !== 'current' && new Date(store.localSettings.filters?.layers?.sigmets?.activeDate).getTime() < dataStore.time.value;
});

watch(() => store.localSettings.filters?.layers?.sigmets?.activeDate, () => refresh());

watch([isExpired, shouldSetCurrent], arr => {
    if (!arr.some(x => x)) return;

    setUserLocalSettings({
        filters: { layers: { sigmets: { activeDate: 'current' } } },
    });

    refresh();
});

watch(dataStore.vatsim.updateTimestamp, () => {
    if (isExpired.value) {
        setUserLocalSettings({
            filters: { layers: { sigmets: { activeDate: 'current' } } },
        });

        refresh();
    }
});

const map = inject<ShallowRef<Map | null>>('map')!;

let layer: VectorImageLayer<any>;
let source: VectorSource;

const types = ref(new Set<string | null | undefined>());

const isMobile = useIsMobile();
const localDisabled = computed(() => store.localSettings.filters?.layers?.sigmets?.disabled);

const jsonFeatures = computed(() => {
    if (!data.value) return [];

    const geoData: Sigmets = { ...data.value };

    geoData.features = geoData.features.filter(x => x.properties.hazard && (store.localSettings.filters?.layers?.sigmets?.showAirmets !== false || (x.properties.dataType !== 'airmet' && x.properties.dataType !== 'gairmet')) && !localDisabled.value?.some(y => x.properties.hazard!.includes(y) || (x.properties.hazard!.includes('WND') && y === 'WIND')));

    const features = geoJson.readFeatures(geoData, {
        featureProjection: 'EPSG:4326',
        dataProjection: 'EPSG:4326',
    });

    features.forEach(x => x.setProperties({
        type: 'sigmet',
    }));

    return features;
});

function buildStyle(color: ColorsListRgb, type: string) {
    return new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, ${ store.localSettings.filters?.layers?.transparencySettings?.sigmets || '0.15' })`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.4)`,
            width: 1,
            lineDash: [12, 6],
        }),
        text: new Text({
            text: `${ type }`,
            font: `bold ${ isMobile.value ? 10 : 12 }px LibreFranklin`,
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.5)`,
            }),
        }),
        zIndex: 1,
    });
}

let styles = {
    default: buildStyle('lightgray125', 'SIGMET'),
    WIND: buildStyle('lightgray200', 'WIND'),
    ICE: buildStyle('primary300', 'ICE'),
    TURB: buildStyle('warning300', 'TURB'),
    MTW: buildStyle('warning300', 'MTW'),
    IFR: buildStyle('info500', 'IFR'),
    TS: buildStyle('error300', 'TS'),
    CONV: buildStyle('error300', 'CONV'),
    VA: buildStyle('lightgray125', 'VA'),
};

watch(() => store.localSettings.filters?.layers?.transparencySettings?.sigmets, () => {
    styles = {
        default: buildStyle('lightgray125', 'SIGMET'),
        WIND: buildStyle('lightgray200', 'WIND'),
        ICE: buildStyle('primary300', 'ICE'),
        TURB: buildStyle('warning300', 'TURB'),
        MTW: buildStyle('warning300', 'MTW'),
        IFR: buildStyle('info500', 'IFR'),
        TS: buildStyle('error300', 'TS'),
        CONV: buildStyle('error300', 'CONV'),
        VA: buildStyle('lightgray125', 'VA'),
    };
});

watch([jsonFeatures, map, localDisabled], () => {
    if (!map.value) return;

    if (!source) {
        source = new VectorSource<any>({
            features: [],
            wrapX: true,
        });

        layer = new VectorImageLayer<any>({
            source: source,
            properties: {
                selectable: true,
                type: 'sigmets',
            },
            declutter: 'sigmets',
            zIndex: 2,
            style: function(_feature) {
                const properties = _feature.getProperties() as Sigmet['properties'];

                types.value.add(properties.hazard);

                const type = getSigmetType(properties.hazard);
                if (!type) return styles.default;

                if (type === 'OBSC') return styles.IFR;
                if (type === 'FZLVL') return styles.ICE;
                if (type === 'WS') return styles.WIND;

                return styles[type] ?? styles.default;
            },
        });

        map.value.addLayer(layer);
    }

    source.clear();
    source.addFeatures(jsonFeatures.value);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source.clear();
    map.value?.removeLayer(layer);
    layer.dispose();
});
</script>
