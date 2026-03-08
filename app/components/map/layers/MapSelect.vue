<template>
    <div>
        <map-html-overlay
            v-if="multiSelectCoordinate"
            :key="String(multiSelectCoordinate)"
            is-interaction
            model-value
            persistent
            :settings="{
                position: multiSelectCoordinate,
                positioning: 'top-center',
                stopEvent: true,
            }"
            :z-index="5"
            @mouseleave="multiSelectCoordinate = null"
            @pointermove.stop
            @update:modelValue="multiSelectCoordinate = null"
        >
            <popup-map-info content-padding="0">
                <template #title>
                    Open overlay for...
                </template>

                <ui-menu :items="multiSelectMenu"/>
            </popup-map-info>
        </map-html-overlay>
        <component
            :is="openedOverlay.component"
            v-else-if="openedOverlay"
            :payload="openedOverlay?.payload"
            @close="openedOverlay = null"
            @id="openedOverlay && (openedOverlay.id = $event)"
        />
    </div>
</template>

<script lang="ts" setup>
import type { ShallowRef } from 'vue';
import type { Feature, Map } from 'ol';
import type { SelectEvent, FilterFunction } from 'ol/interaction/Select.js';
import Select from 'ol/interaction/Select.js';
import { pointerMove, always, singleClick } from 'ol/events/condition.js';
import type { PartialRecord } from '~/types';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import { getMapFeature, globalMapEntities, isMapFeature } from '~/utils/map/entities';
import type { MapFeaturesType } from '~/utils/map/entities';
import MapPopupAirport from '~/components/map/popups/MapPopupAirport.vue';
import MapPopupAirportCounter from '~/components/map/popups/MapPopupAirportCounter.vue';
import MapPopupAircraft from '~/components/map/popups/MapPopupAircraft.vue';
import MapPopupSigmet from '~/components/map/popups/MapPopupSigmet.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import type { Coordinate } from 'ol/coordinate.js';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import UiMenu from '~/components/ui/data/UiMenu.vue';
import type { UIMenuItem } from '~/components/ui/data/UiMenu.vue';

const map = inject<ShallowRef<Map | null>>('map')!;
let hoverSelect: Select | undefined;
let clickSelect: Select | undefined;

function multiSelectCleanup() {
    if (multiSelectFeatures.value.length === 1) return;

    const features = clickSelect?.getFeatures()?.getArray() ?? [];
    for (const selectedFeature of features) {
        if (!multiSelectFeatures.value.some(x => x.feature === selectedFeature)) {
            clickSelect?.deselectFeature(selectedFeature);
        }
    }

    multiSelectCoordinate.value = null;
    multiSelectFeatures.value = [];
}

const multiSelectCoordinate = shallowRef<Coordinate | null>(null);
const multiSelectFeatures = shallowRef<{ definition: Definition; feature: Feature }[]>([]);
const multiSelectMenu = computed<UIMenuItem[]>(() => {
    return multiSelectFeatures.value.map(({ feature, definition }) => {
        const properties = feature.getProperties();

        const payload: RadarEventPayload<any> = {
            coordinate: multiSelectCoordinate.value!,
            feature,
            additionalPayload: undefined,
        };

        if (isMapFeature('sigmet', properties)) {
            return {
                title: 'SIGMETs',
                onClick: () => definition.click?.(payload),
            };
        }

        if (isMapFeature('sector-vatglasses', properties)) {
            return {
                title: `VATGlasses sector ${ properties.positionId } for ${ properties.atc.map(x => x.callsign).join(', ') }`,
                onClick: () => definition.click?.(payload),
            };
        }

        return {
            title: `Unknown feature ${ properties.type }`,
            onClick: () => {
                console.log(properties);
            },
        };
    });
});

const rightClickCoordinate = shallowRef<Coordinate | null>(null);
const rightClickFeature = shallowRef<Feature | null>(null);

type EventType = 'click' | 'hover' | 'rightClick';

const mapStore = useMapStore();

interface Overlay {
    overlayComponent?: Component;
}

const interactableElements = {
    airportControllers: {
        overlayComponent: MapPopupAirport,
    },
    airportCounter: {
        overlayComponent: MapPopupAirportCounter,
    },
    aircraft: {
        overlayComponent: MapPopupAircraft,
    },
    sigmet: {
        overlayComponent: MapPopupSigmet,
    },
} satisfies Record<string, Overlay>;

type OverlayKey = keyof typeof interactableElements;

const openedOverlay = shallowRef<{ key: OverlayKey; interactionKey: SelectableFeatures; component: Component; payload: RadarEventPayload<any, any>; id?: string } | null>();
const isMobileOrTablet = useIsMobileOrTablet();

watch(() => mapStore.openOverlayId, id => {
    if (openedOverlay.value?.id && openedOverlay.value?.id !== id) openedOverlay.value = null;
});

function openOverlay(key: OverlayKey, payload: RadarEventPayload<any, any>, interactionKey: SelectableFeatures) {
    const element = interactableElements[key];
    if (openedOverlay.value?.key === key || (openedOverlay.value?.id && openedOverlay.value?.id !== mapStore.openOverlayId) || !('overlayComponent' in element)) return;

    rightClickCoordinate.value = null;
    rightClickFeature.value = null;

    openedOverlay.value = {
        key,
        interactionKey,
        component: element.overlayComponent,
        payload,
    };

    multiSelectCleanup();
}

type Definition = {
    featureTypes: MapFeaturesType[];
} & PartialRecord<EventType, (payload: RadarEventPayload<any>) => void | boolean>;

let previouslySelected: Feature | undefined;

function selectFeature(feature: false): void;
function selectFeature(feature: Feature, selected: boolean): void;
function selectFeature(feature: Feature | false, selected?: boolean) {
    if (previouslySelected) {
        const feature = previouslySelected;
        previouslySelected = undefined;
        selectFeature(feature, false);
    }

    if (!feature) return;

    feature.setProperties({ ...feature.getProperties(), selected });
    previouslySelected = feature;
    feature.changed();
}

const definitions = {
    airportControllers: {
        featureTypes: ['airport'],
        hover: payload => {
            const properties = payload.feature.getProperties();

            if (isMapFeature('airport', properties) && properties.atc.length) {
                openOverlay('airportControllers', payload, 'airportControllers');
            }
        },
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportLocal: {
        featureTypes: ['airport-atc'],
        hover: payload => openOverlay('airportControllers', payload, 'airportLocal'),
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportApproach: {
        featureTypes: ['airport-tracon-label', 'airport-circle-label'],
        hover: payload => {
            openOverlay('airportControllers', payload, 'airportApproach');
            const id = payload.feature.getProperties().id;
            const circle = getMapFeature('airport-circle', globalMapEntities.airports!, id.slice(0, id.length - 5));
            if (circle) {
                selectFeature(circle, true);
                circle.changed();
            }
        },
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportCounter: {
        featureTypes: ['airport-counter'],
        hover: payload => {
            return openOverlay('airportCounter', payload, 'airportCounter');
        },
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    sector: {
        featureTypes: ['sector'],
        hover: payload => {
            return openOverlay('airportControllers', payload, 'sector');
        },
    },
    sectorVG: {
        featureTypes: ['sector-vatglasses'],
        hover: () => {
            return true;
        },
        click: payload => {
            return openOverlay('airportControllers', {
                ...payload,
                additionalPayload: states.click.selectedFeatures.value.filter(x => {
                    const properties = x.getProperties();
                    return isMapFeature('sector-vatglasses', properties) && properties.atc;
                }).map(x => x.getProperties()).sort((a, b) => b.min - a.min),
            }, 'sectorVG');
        },
    },
    sigmet: {
        featureTypes: ['sigmet'],
        hover: () => {
            return true;
        },
        click: payload => {
            return openOverlay('sigmet', {
                ...payload,
                additionalPayload: states.click.selectedFeatures.value.filter(x => {
                    const properties = x.getProperties();
                    return isMapFeature('sigmet', properties);
                }).map(x => x.getProperties()),
            }, 'sigmet');
        },
    },
    aircraft: {
        featureTypes: ['aircraft'],
        hover: payload => {
            const cid = payload.feature.getProperties().cid;

            nextTick().then(() => {
                if (!states.hover.selectedFeatures.value.includes(payload.feature)) return;

                mapStore.hoveredPilot = cid;

                const watcher = watch(states.hover.selectedFeatures, val => {
                    if (!val.includes(payload.feature) && mapStore.hoveredPilot === cid) {
                        mapStore.hoveredPilot = null;
                        watcher();
                    }
                });

                openOverlay('aircraft', payload, 'aircraft');
            });
        },
        click: payload => {
            mapStore.addPilotOverlay(payload.feature.getProperties().cid);
        },
    },
    distance: {
        featureTypes: ['distance'],
        hover: () => {
            return true;
        },
        click: payload => {
            const properties = payload.feature.getProperties();
            if (isMapFeature('distance', properties)) {
                const id = properties.id;
                const index = mapStore.distance.items.findIndex(x => x.date === id);
                if (index === -1) return;

                clickSelect?.deselectFeature(payload.feature);
                mapStore.distance.items.splice(index, 1);
            }
        },
    },
} satisfies Record<SelectableFeatures, Definition>;

type SelectableFeatures = 'airportControllers' | 'airportLocal' | 'airportApproach' | 'airportCounter' | 'sector' | 'sectorVG' | 'aircraft' | 'sigmet' | 'distance';

const states: Record<EventType, { priorities: Array<SelectableFeatures | 'multi'>; multiSelect: PartialRecord<SelectableFeatures, { title: string; priority?: number }>; selectedFeatures: Ref<Feature[]> }> = {
    hover: {
        priorities: [
            'sector', 'airportControllers', 'airportCounter', 'airportApproach', 'airportLocal', 'aircraft', 'sectorVG', 'sigmet', 'distance',
        ],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
    click: {
        priorities: [
            'distance',
            'airportControllers',
            'airportCounter',
            'airportApproach',
            'airportLocal',
            'aircraft',
            'multi',
            'sectorVG',
            'sigmet',
        ],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
    rightClick: {
        priorities: ['multi'],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
};

let hoverAwaiting = false;

function createSelectHandler(type: EventType, select: Select) {
    return async (arg: SelectEvent) => {
        try {
            const selected = (arg.mapBrowserEvent && type !== 'hover') ? arg.selected : select.getFeatures().getArray();

            if (hoverAwaiting && selected.length && selected.length === states[type].selectedFeatures.value.length && selected.every(x => states[type].selectedFeatures.value.includes(x))) return;
            states[type].selectedFeatures.value = selected.slice(0);

            if (arg.mapBrowserEvent && states[type].priorities.includes('multi')) {
                multiSelectFeatures.value = [];
                multiSelectCoordinate.value = null;
            }

            if (!selected.length) {
                openedOverlay.value = null;
                if (type === 'hover') {
                    sleep(100).then(() => {
                        if (!select.getFeatures().getArray().length) {
                            mapStore.mapCursorPointerTrigger = 0;
                            openedOverlay.value = null;
                            selectFeature(false);
                        }
                    });
                }

                selectFeature(false);
            }

            if (!arg.mapBrowserEvent) return;

            let tookAction = false;
            let multiselect = false;

            const featuresWithProperties = selected.map(x => ({
                feature: x,
                properties: x.getProperties(),
            }));

            async function featureAction(feature: Feature, definition: Definition) {
                if (openedOverlay.value && openedOverlay.value.payload.feature !== feature) openedOverlay.value = null;

                if (type === 'hover') {
                    hoverAwaiting = true;
                    await sleep(50);
                    hoverAwaiting = false;

                    if (!selected.length || !selected.every(x => states[type].selectedFeatures.value.includes(x)) || selected.length !== states[type].selectedFeatures.value.length) return;

                    selectFeature(feature, true);
                }

                const result = (definition as any)[type]({
                    feature,
                    coordinate: arg.mapBrowserEvent.coordinate,
                });

                tookAction = true;

                if (type === 'hover' && result === false) {
                    mapStore.mapCursorPointerTrigger = 0;
                    return false;
                }

                if (type === 'hover') {
                    mapStore.mapCursorPointerTrigger = 100;
                }
                else {
                    hoverSelect?.selectFeature(feature);
                }

                const features = select.getFeatures();
                for (const selectedFeature of features?.getArray() ?? []) {
                    if (selectedFeature !== feature) {
                        select.deselectFeature(selectedFeature);
                    }
                }
            }

            if (selected.length) {
                for (const priority of states[type].priorities) {
                    // TODO
                    if (priority === 'multi') {
                        multiselect = true;

                        continue;
                    }

                    const definition = definitions[priority];

                    if (!(type in definition)) continue;

                    const targetFeature = featuresWithProperties.find(x => (definition.featureTypes as any[]).includes(x.properties.type));
                    if (!targetFeature) continue;

                    if (multiselect) {
                        multiSelectFeatures.value.push({
                            definition,
                            feature: targetFeature.feature,
                        });
                        continue;
                    }

                    const result = await featureAction(targetFeature.feature, definition);

                    if (result === false) continue;

                    break;
                }

                if (multiselect && multiSelectFeatures.value.length) {
                    if (multiSelectFeatures.value.length === 1) {
                        await featureAction(multiSelectFeatures.value[0].feature, multiSelectFeatures.value[0].definition);
                        console.log(multiSelectFeatures.value.length);
                        multiSelectCleanup();
                        return;
                    }

                    multiSelectCoordinate.value = arg.mapBrowserEvent.coordinate;

                    return;
                }
            }

            if (!tookAction) {
                if (type === 'hover') {
                    mapStore.mapCursorPointerTrigger = 0;
                    select.clearSelection();
                }
                else if (type === 'click') {
                    select?.clearSelection();
                }
                openedOverlay.value = null;
                selectFeature(false);
            }
        }
        catch (e) {
            alert('select error!');
            throw e;
        }
    };
}

watch(map, val => {
    if (!val) return;

    const filter: FilterFunction = (feature, layer) => {
        if (!layer) return false;
        const type = layer.getProperties().type;
        const featureType = feature.getProperties().type;
        const selectable = layer.getProperties().selectable;

        // TODO
        return selectable || type?.startsWith('airports') || (type === 'sectors-labels' && featureType !== 'sector-vatglasses') || (type === 'sectors-list' && featureType === 'sector-vatglasses');
    };

    hoverSelect = new Select({
        condition: pointerMove,
        multi: true,
        style: null,
        hitTolerance: 5,
        filter,
    });

    hoverSelect.on('select', createSelectHandler('hover', hoverSelect));

    map.value?.addInteraction(hoverSelect);

    clickSelect = new Select({
        condition: singleClick,
        hitTolerance: 10,
        multi: true,
        style: null,
        toggleCondition: always,
        filter,
    });

    clickSelect.on('select', createSelectHandler('click', clickSelect));

    watch(openedOverlay, val => {
        if (!val) {
            clickSelect?.clearSelection();
        }
    });

    map.value?.addInteraction(clickSelect);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (hoverSelect) {
        hoverSelect?.dispose();
        map.value?.removeInteraction(hoverSelect);
    }

    if (clickSelect) {
        clickSelect?.dispose();
        map.value?.removeInteraction(clickSelect);
    }
});
</script>

<style lang="scss" scoped>
.select-result {
    display: block;
}

.test {
    width: 300px;
    height: 300px;
    background: black;
}
</style>
