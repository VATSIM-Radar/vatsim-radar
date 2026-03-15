<template>
    <div
        v-if="navigraphSource"
        class="layers"
    >
        <template v-if="mapStore.zoom > 5 && !store.localSettings.disableNavigraph">
            <navigraph-ndb v-if="store.mapSettings.navigraphData?.ndb || store.mapSettings.navigraphData?.vordme"/>
            <navigraph-airways v-if="store.mapSettings.navigraphData?.airways?.enabled"/>
            <navigraph-waypoints v-if="store.mapSettings.navigraphData?.waypoints"/>
            <navigraph-holdings/>
        </template>
        <navigraph-procedures/>
        <navigraph-route v-if="!store.localSettings.disableNavigraphRoute"/>
        <navigraph-nat
            v-if="store.localSettings.natTrak?.enabled"
            :key="JSON.stringify(store.localSettings.natTrak)"
        />
        <map-html-overlay
            v-if="activeFeature"
            model-value
            :settings="{ position: activeFeature!.coords, stopEvent: true }"
            :z-index="8"
            @update:modelValue="activeFeature = null"
        >
            <popup-map-info
                @mouseleave="activeFeature = null"
            >
                <template #title>
                    <template v-if="activeFeature && isNDB(activeFeature)">
                        {{ activeFeature.data.navaid.ident }}
                    </template>
                    <template v-if="activeFeature && isVHF(activeFeature)">
                        {{ activeFeature.data.navaid.ident ?? activeFeature.data.ident }}
                    </template>
                    <template v-else-if="activeFeature && isAirway(activeFeature)">
                        {{ activeFeature.data.airway.identifier }}
                    </template>
                    <template v-else-if="activeFeature && isHolding(activeFeature)">
                        {{ activeFeature.data.name }}
                    </template>
                    <template v-else-if="activeFeature && isNat(activeFeature)">
                        {{ activeFeature.data.identifier }}
                    </template>
                </template>
                <div
                    class="layers_info"
                    :class="[`layers_info--type-${ activeFeature.type }`]"
                >
                    <template v-if="activeFeature && isVHF(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Name', activeFeature.data.navaid.name],
                                ['DME Ident', activeFeature.data.navaid.ident],
                                ['Frequency', activeFeature.data.frequency],
                                ['Magnetic Variation', `${ activeFeature.data.magneticVariation }°`],
                                ['Elevation', `${ activeFeature.data.elevation } ft`],
                                ['Range', activeFeature.data.range],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--flex"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeFeature && isNDB(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Name', activeFeature.data.navaid.name],
                                ['Frequency', `${ activeFeature.data.frequency } kHz`],
                                ['Magnetic Variation', `${ activeFeature.data.magneticVariation }°`],
                                ['Range', activeFeature.data.range],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--flex"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeFeature && isAirway(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Inbound course', activeFeature.additionalData?.waypoint?.inbound],
                                ['Outbound course', activeFeature.additionalData?.waypoint?.outbound],
                                ['Minimum altitude', activeFeature.additionalData?.waypoint?.minAlt],
                                ['Maximum altitude', activeFeature.additionalData?.waypoint?.maxAlt],
                                ['Direction restriction', activeFeature.additionalData?.waypoint?.direction === 'F' ? 'Forward' : activeFeature.additionalData?.waypoint?.direction === 'B' ? 'Backwards' : null],
                                ['Level', activeFeature.additionalData?.waypoint?.flightLevel === 'H' ? 'High' : activeFeature.additionalData?.waypoint?.flightLevel === 'L' ? 'Low' : 'Both'],
                            ] as [string, any][]).filter(x => x[1])"
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
                    </template>
                    <template v-else-if="activeFeature && isHolding(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Max Speed', activeFeature.data.speed],
                                ['Inbound Course', activeFeature.data.inboundCourse],
                                ['Leg length', activeFeature.data.legLength],
                                ['Leg time', activeFeature.data.legTime],
                                ['Min alt', activeFeature.data.minAlt],
                                ['Max alt', activeFeature.data.maxAlt],
                                ['Turns', activeFeature.data.turns === 'L' ? 'Left' : 'Right'],
                                ['Waypoint', activeFeature.data.waypoint?.identifier],
                            ] as [string, any][]).filter(x => x[1])"
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
                    </template>
                    <div
                        v-else-if="activeFeature && isNat(activeFeature)"
                        class="layers__nat"
                    >
                        <div
                            v-if="activeFeature.data.valid_from"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Active from
                            </div>
                            <span>
                                {{ datetime.format(activeFeature.data.valid_from) }}Z
                            </span>
                        </div>
                        <div
                            v-if="activeFeature.data.valid_to"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Active to
                            </div>
                            <span>
                                {{ datetime.format(activeFeature.data.valid_to) }}Z
                            </span>
                        </div>
                        <div
                            v-if="activeFeature.data.flight_levels?.length"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Valid at
                            </div>
                            <div>
                                <span
                                    v-for="(level, index) in activeFeature.data.flight_levels"
                                    :key="level + index"
                                >
                                    FL{{level / 100}}
                                </span>
                            </div>
                        </div>
                        <div
                            v-if="activeFeature.data.direction"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Direction
                            </div>
                            <div>
                                <template v-if="activeFeature.data.direction === 'west'">
                                    West
                                </template>
                                <template v-else-if="activeFeature.data.direction === 'east'">
                                    East
                                </template>
                                <template v-else>
                                    Bidirectional track
                                </template>
                            </div>
                        </div>
                        <ui-copy-info
                            :text="activeFeature.data.last_routeing"
                        >
                            Route
                        </ui-copy-info>
                    </div>
                </div>
            </popup-map-info>
        </map-html-overlay>
    </div>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import VectorSource from 'ol/source/Vector';
import NavigraphNdb from '~/components/map/navigraph/NavigraphNdb.vue';
import type { Coordinate } from 'ol/coordinate.js';
import { useStore } from '~/store';
import NavigraphAirways from '~/components/map/navigraph/NavigraphAirways.vue';
import VectorImageLayer from 'ol/layer/VectorImage';
import NavigraphWaypoints from '~/components/map/navigraph/NavigraphWaypoints.vue';
import NavigraphHoldings from '~/components/map/navigraph/NavigraphHoldings.vue';
import type { NavigraphGetData, NavigraphNavData } from '~/utils/server/navigraph/navdata/types';
import { useMapStore } from '~/store/map';
import NavigraphProcedures from '~/components/map/navigraph/NavigraphProcedures.vue';
import NavigraphRoute from '~/components/map/navigraph/NavigraphRoute.vue';
import NavigraphNat from '~/components/map/navigraph/NavigraphNat.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import type { VatsimNattrakClient } from '~/types/data/vatsim';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import { setNavigraphStyle } from '~/composables/render/navigraph/style';

const navigraphSource = shallowRef<VectorSource | null>(null);
let navigraphLayer: VectorImageLayer<any> | undefined;

const store = useStore();

provide('navigraph-source', navigraphSource);

const map = inject<ShallowRef<Map | null>>('map')!;
const mapStore = useMapStore();

type ActiveFeature<T extends keyof NavigraphNavData> = {
    coords: Coordinate;
    type: T;
    data: NavigraphGetData<T>;
    additionalData?: Record<string, any>;
    properties: Record<string, any>;
};

const datetime = new Intl.DateTimeFormat(['ru-RU'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    year: 'numeric',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
});

interface NatFeature {
    coords: Coordinate;
    type: 'nat';
    data: VatsimNattrakClient;
    additionalData?: Record<string, any>;
    properties: Record<string, any>;
}

const activeFeature: Ref<ActiveFeature<keyof NavigraphNavData> | NatFeature | null> = ref(null);

function isVHF(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'vhf'> {
    return activeFeature.type === 'vhf';
}

function isNDB(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'ndb'> {
    return activeFeature.type === 'ndb';
}

function isAirway(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'airways'> {
    return activeFeature.type === 'airways';
}

function isHolding(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'holdings'> {
    return activeFeature.type === 'holdings';
}

function isNat(activeFeature: ActiveFeature<any>): activeFeature is NatFeature {
    return activeFeature.type === 'nat';
}

const showAirwaysLabels = computed(() => store.mapSettings.navigraphData?.airways?.showAirwaysLabel !== false);
const showWaypointsLabels = computed(() => store.mapSettings.navigraphData?.airways?.showWaypointsLabel !== false);

watch([showAirwaysLabels, showWaypointsLabels], () => navigraphSource.value?.changed());

async function handleMapClick(event: MapBrowserEvent<any>) {
    const features = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 21, layerFilter: val => val === navigraphLayer });

    if (!features?.length) return activeFeature.value = null;

    const feature = features[0];
    const properties = feature.getProperties();

    if (properties.kind === 'nat') {
        activeFeature.value = {
            coords: event.coordinate,
            type: 'nat',
            // @ts-expect-error Dynamic type
            data: properties,
            additionalData: {},
            properties: {},
        };

        return;
    }

    if (!properties.type.endsWith('waypoint') && properties.key) {
        activeFeature.value = null;
        await sleep(0);
        const data = await getNavigraphData({
            data: properties.type.replace('enroute-', ''),
            key: properties.key,
        });
        mapStore.openOverlayId = null;
        await nextTick();
        activeFeature.value = {
            coords: event.coordinate,
            type: properties.type.replace('enroute-', '') as keyof NavigraphNavData,
            data,
            properties,
        };

        if (isAirway(activeFeature.value)) {
            activeFeature.value.additionalData = {
                waypoint: activeFeature.value.data.waypoints.find(x => x.identifier === properties.waypoint),
            };
        }
    }
    else activeFeature.value = null;
}

watch(map, val => {
    if (!val) return;

    if (!navigraphLayer) {
        navigraphSource.value = new VectorSource({ wrapX: true });

        navigraphLayer = new VectorImageLayer<any>({
            source: navigraphSource.value,
            zIndex: 6,
            // minZoom: 5,
            declutter: 'navigraph',
            properties: {
                selectable: true,
            },
        });

        setNavigraphStyle(navigraphLayer);

        map.value?.addLayer(navigraphLayer);
        map.value?.on('singleclick', handleMapClick);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (navigraphLayer) {
        map.value?.removeLayer(navigraphLayer);
    }
    navigraphLayer?.dispose();
    navigraphSource.value?.clear();
    map.value?.un('singleclick', handleMapClick);
});
</script>

<style scoped lang="scss">
.layers_info {
    cursor: initial;

    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    max-width: 300px;

    font-size: 14px;

    &--type-nat {
        width: 300px;

        .layers__nat {
            width: 100%;
        }
    }

    @include mobileOnly {
        max-width: calc(100dvw - 48px);
    }
}
</style>
