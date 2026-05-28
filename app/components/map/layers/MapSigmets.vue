<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import type { Sigmet, Sigmets } from '~/utils/server/storage';
import VectorSource from 'ol/source/Vector.js';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import { Fill, Stroke, Style, Text } from 'ol/style.js';
import type { ColorsListRgb } from '~/utils/colors';
import { getCurrentThemeRgbColor, getSigmetType } from '~/composables';
import { useRadarError } from '~/composables/errors';
import type { SigmetType } from '~/types/map';

defineOptions({
    render: () => null,
});

const dataStore = useDataStore();
const store = useStore();
let initialCall = false;
const sigmetsActiveDate = computed({
    get: () => store.localSettings.sigmetsDate ?? 'current',
    set: (value: string) => setUserLocalSettings({ sigmetsDate: value }),
});
const enabledSigmets = useSettingValueFromFunc('sigmets.enabled');
const showAirmets = useSettingValueFromFunc('sigmets.showAirmets');

const { refresh, data } = await useAsyncData<Sigmets>('sigmets', () => {
    try {
        let url = '/api/data/sigmets';
        const activeDate = sigmetsActiveDate.value;

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
    return sigmetsActiveDate.value && sigmetsActiveDate.value !== 'current' && new Date(sigmetsActiveDate.value).getTime() < dataStore.time.value;
});

watch(sigmetsActiveDate, () => refresh());

watch([isExpired, shouldSetCurrent], arr => {
    if (!arr.some(x => x)) return;

    sigmetsActiveDate.value = 'current';

    refresh();
});

watch(dataStore.vatsim.updateTimestamp, () => {
    if (isExpired.value) {
        sigmetsActiveDate.value = 'current';

        refresh();
    }
});

const map = inject<ShallowRef<Map | null>>('map')!;

let layer: VectorImageLayer<any>;
let source: VectorSource;

const types = ref(new Set<string | null | undefined>());

const isMobile = useIsMobile();
const jsonFeatures = computed(() => {
    if (!data.value) return [];

    const geoData: Sigmets = { ...data.value };

    geoData.features = geoData.features.filter(x => x.properties.hazard &&
        (showAirmets.value || (x.properties.dataType !== 'airmet' && x.properties.dataType !== 'gairmet')) &&
        enabledSigmets.value.some((y: SigmetType) => x.properties.hazard!.includes(y) || (x.properties.hazard!.includes('WND') && y === 'WIND')));

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
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, ${ getKeyedValueFromSettings('map.layers.transparency.sigmets') || '0.15' })`,
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
    default: buildStyle('lightGray400', 'SIGMET'),
    WIND: buildStyle('lightGray600', 'WIND'),
    ICE: buildStyle('blue300', 'ICE'),
    TURB: buildStyle('orange300', 'TURB'),
    MTW: buildStyle('orange300', 'MTW'),
    IFR: buildStyle('purple500', 'IFR'),
    TS: buildStyle('red300', 'TS'),
    CONV: buildStyle('red300', 'CONV'),
    VA: buildStyle('lightGray400', 'VA'),
};

watch(() => getKeyedValueFromSettings('map.layers.transparency.sigmets'), () => {
    styles = {
        default: buildStyle('lightGray400', 'SIGMET'),
        WIND: buildStyle('lightGray600', 'WIND'),
        ICE: buildStyle('blue300', 'ICE'),
        TURB: buildStyle('orange300', 'TURB'),
        MTW: buildStyle('orange300', 'MTW'),
        IFR: buildStyle('purple500', 'IFR'),
        TS: buildStyle('red300', 'TS'),
        CONV: buildStyle('red300', 'CONV'),
        VA: buildStyle('lightGray400', 'VA'),
    };
});

watch([jsonFeatures, map, enabledSigmets], () => {
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
