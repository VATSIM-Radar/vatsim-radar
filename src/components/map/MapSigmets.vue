<template>
    <map-overlay
        v-if="openSigmet"
        :settings="{ position: openSigmet.pixel, stopEvent: true }"
        :z-index="5"
        @update:modelValue="openSigmet = null"
    >
        <common-popup-block
            class="sigmets"
            @mouseleave="openSigmet = null"
        >
            <template #title>
                SIGMETs
            </template>
            <div class="sigmets_list">
                <div
                    v-for="(sigmet, index) in openSigmet.sigmets"
                    :key="index"
                    class="sigmets__sigmet"
                >
                    <div
                        v-for="field in sigmetFields(sigmet)"
                        :key="field[0]"
                        class="__grid-info-sections __grid-info-sections--vertical"
                    >
                        <div class="__grid-info-sections_title">
                            {{ field[0] }}
                        </div>
                        <span>
                            {{ field[1] }}
                        </span>
                    </div>
                </div>
            </div>
        </common-popup-block>
    </map-overlay>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import type { Sigmet, Sigmets } from '~/utils/backend/storage';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { ColorsList } from '~/utils/backend/styles';
import type { Coordinate } from 'ol/coordinate';
import RenderFeature from 'ol/render/Feature';
import { getCurrentThemeRgbColor, getSigmetType } from '~/composables';
import { useStore } from '~/store';

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
        console.error(e);
        throw e;
    }
}, {
    server: false,
});

const isExpired = computed(() => {
    return data.value?.validUntil && data.value.validUntil < dataStore.time.value;
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
});

const zuluTime = new Intl.DateTimeFormat(['en-GB'], {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const zuluDate = new Intl.DateTimeFormat(['en-GB'], {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
});

const map = inject<ShallowRef<Map | null>>('map')!;
const openSigmet = ref<{
    sigmets: Array<Sigmet['properties']>;
    pixel: Coordinate;
} | null>(null);

const sigmetFields = (sigmet: Sigmet['properties']): [string, string | number][] => {
    const fields: [string, string][] = [];

    if (sigmet.region || sigmet.regionName) fields.push(['Region / FIR', `${ sigmet.region || sigmet.regionName || '' }`]);
    if (sigmet.type || sigmet.hazard) fields.push(['Hazard / Type', `${ sigmet.hazard ?? '' } ${ sigmet.type ? ` / ${ sigmet.type }` : '' }`]);
    if (sigmet.qualifier) fields.push(['Qualifier', `${ sigmet.qualifier ?? '' }`]);
    if (sigmet.timeFrom) {
        const from = new Date(sigmet.timeFrom);
        const to = new Date(sigmet.timeTo ?? '');

        let text = `${ zuluDate.format(from) } ${ zuluTime.format(from) }Z`;

        if (sigmet.timeTo) text += ` - ${ zuluTime.format(to) }Z`;

        fields.push(['Active', text]);
    }

    if ((sigmet.base !== null && sigmet.base !== undefined) || (sigmet.top !== null && sigmet.top !== undefined)) {
        const text: string[] = [];

        if (sigmet.base !== null && sigmet.base !== undefined) text.push(`From ${ sigmet.base }`);
        if (sigmet.top !== null && sigmet.top !== undefined) text.push(`To ${ sigmet.top }`);

        fields.push(['Level / Alt', text.join(' | ')]);
    }

    if (sigmet.dir || sigmet.spd || sigmet.change) {
        const text: string[] = [];

        if (sigmet.dir) text.push(`DIR ${ sigmet.dir }`);
        if (sigmet.spd) text.push(`SPD ${ sigmet.spd }`);
        if (sigmet.change) text.push(`${ sigmet.change }`);

        fields.push(['Info', text.join(' / ')]);
    }

    if (sigmet.raw) fields.push(['Raw', sigmet.raw]);

    return fields;
};

let layer: VectorImageLayer<any>;
let source: VectorSource;

const types = ref(new Set<string | null | undefined>());

const localDisabled = computed(() => store.localSettings.filters?.layers?.sigmets?.disabled);

const jsonFeatures = computed(() => {
    if (!data.value) return [];

    const geoData: Sigmets = { ...data.value };

    geoData.features = geoData.features.filter(x => x.properties.hazard && (store.localSettings.filters?.layers?.sigmets?.showAirmets !== false || (x.properties.dataType !== 'airmet' && x.properties.dataType !== 'gairmet')) && !localDisabled.value?.some(y => x.properties.hazard!.includes(y) || (x.properties.hazard!.includes('WND') && y === 'WIND')));

    return geojson.readFeatures(geoData, {
        featureProjection: 'EPSG:4326',
        dataProjection: 'EPSG:4326',
    });
});

const geojson = new GeoJSON({
    featureProjection: 'EPSG:4326',
    dataProjection: 'EPSG:4326',
});

function buildStyle(color: ColorsList, type: string) {
    return new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.6)`,
            width: 1,
            lineDash: [12, 2],
        }),
        text: new Text({
            text: `${ type }`,
            font: 'bold 14px Montserrat',
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.6)`,
            }),
        }),
        zIndex: 1,
    });
}

const styles = {
    default: buildStyle('lightgray125', 'SIGMET'),
    WIND: buildStyle('error300', 'WIND'),
    ICE: buildStyle('primary300', 'ICE'),
    TURB: buildStyle('warning300', 'TURB'),
    MTW: buildStyle('warning300', 'MTW'),
    IFR: buildStyle('info500', 'IFR'),
    TS: buildStyle('error300', 'TS'),
    VA: buildStyle('lightgray125', 'VA'),
};

function handleMapClick(event: MapBrowserEvent<any>) {
    openSigmet.value = null;
    const features = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 2 });
    if (!features?.every(x => x instanceof RenderFeature || x.getProperties().dataType || x.getProperties().type === 'local')) return;

    const sigmets = features.filter(x => x.getProperties()?.dataType);
    if (!sigmets.length) return;

    openSigmet.value = {
        pixel: event.coordinate,
        sigmets: sigmets.map(x => x.getProperties() as any),
    };
}

attachMoveEnd(() => openSigmet.value = null);

watch([jsonFeatures, map, localDisabled], () => {
    if (!map.value) return;

    if (!source) {
        map.value.on('click', handleMapClick);

        source = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        layer = new VectorImageLayer<any>({
            source: source,
            properties: {
                type: 'sigmets',
            },
            declutter: true,
            zIndex: 6,
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

    source.removeFeatures(source.getFeatures());
    source.addFeatures(jsonFeatures.value);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    map.value?.removeLayer(layer);
    map.value?.un('click', handleMapClick);
});
</script>

<style scoped lang="scss">
.sigmets {
    &_list {
        cursor: initial;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 300px;
    }

    &__sigmet {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        max-width: 350px;
        padding: 8px;
        border-radius: 4px;

        font-size: 13px;
        overflow-wrap: anywhere;

        background: $darkgray900;

        @include mobileOnly {
            max-width: 70dvw;
        }

        .__grid-info-sections {
            gap: 0 !important;
            padding: 8px;
            border-radius: 8px;
            background: $darkgray850;
        }
    }
}
</style>
