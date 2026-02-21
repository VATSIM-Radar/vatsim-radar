<template>
    <div>
        <component
            :is="openedOverlay.component"
            v-if="openedOverlay"
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

const map = inject<ShallowRef<Map | null>>('map')!;
let hoverSelect: Select | undefined;
let clickSelect: Select | undefined;

type EventType = 'click' | 'hover' | 'rightClick';

const mapStore = useMapStore();

interface Overlay {
    featureTypes: MapFeaturesType[];
    overlayComponent?: Component;
}

const interactableElements = {
    airportControllers: {
        featureTypes: ['airport'],
        overlayComponent: MapPopupAirport,
    },
    airportCounter: {
        featureTypes: ['airport-counter'],
        overlayComponent: MapPopupAirportCounter,
    },
} satisfies Record<string, Overlay>;

type OverlayKey = keyof typeof interactableElements;

const openedOverlay = shallowRef<{ key: OverlayKey; interactionKey: SelectableFeatures; component: Component; payload: RadarEventPayload<any>; id?: string } | null>();

watch(() => mapStore.openOverlayId, id => {
    if (openedOverlay.value?.id && openedOverlay.value?.id !== id) openedOverlay.value = null;
});

function openOverlay(key: OverlayKey, payload: RadarEventPayload<any>, interactionKey: SelectableFeatures) {
    const element = interactableElements[key];
    if (openedOverlay.value?.key === key || (openedOverlay.value?.id && openedOverlay.value?.id !== mapStore.openOverlayId) || !('overlayComponent' in element)) return;

    openedOverlay.value = {
        key,
        interactionKey,
        component: element.overlayComponent,
        payload,
    };
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
            return openOverlay('airportControllers', payload, 'sectorVG');
        },
    },
} satisfies Record<SelectableFeatures, Definition>;

type SelectableFeatures = 'airportControllers' | 'airportLocal' | 'airportApproach' | 'airportCounter' | 'sector' | 'sectorVG';

const states: Record<EventType, { priorities: Array<SelectableFeatures | 'multi'>; multiSelect: PartialRecord<SelectableFeatures, { title: string; priority?: number }>; selectedFeatures: Feature[] }> = {
    click: {
        priorities: [
            'airportControllers',
            'airportCounter',
            'airportApproach',
            'airportLocal',
            'sectorVG',
            'multi',
        ],
        multiSelect: {},
        selectedFeatures: [],
    },
    hover: {
        priorities: [
            'sector', 'airportControllers', 'airportCounter', 'airportApproach', 'airportLocal', 'sectorVG',
        ],
        multiSelect: {},
        selectedFeatures: [],
    },
    rightClick: {
        priorities: ['multi'],
        multiSelect: {},
        selectedFeatures: [],
    },
};

let hoverAwaiting = false;

function createSelectHandler(type: EventType, select: Select) {
    return async (arg: SelectEvent) => {
        const selected = select.getFeatures().getArray();

        if (hoverAwaiting && selected.length && selected.every(x => states[type].selectedFeatures.includes(x))) return;
        states[type].selectedFeatures = selected;

        if (!selected.length) {
            openedOverlay.value = null;
            if (type === 'hover') {
                sleep(100).then(() => {
                    if (!select.getFeatures().getArray().length) mapStore.mapCursorPointerTrigger = 0;
                });
            }
            selectFeature(false);
        }

        if (!arg.mapBrowserEvent) return;

        let tookAction = false;

        const featuresWithProperties = selected.map(x => ({
            feature: x,
            properties: x.getProperties(),
        }));

        if (selected.length) {
            for (const priority of states[type].priorities) {
                // TODO
                if (priority === 'multi') break;
                const definition = definitions[priority];

                if (!(type in definition)) continue;

                const targetFeature = featuresWithProperties.find(x => (definition.featureTypes as any[]).includes(x.properties.type));
                if (!targetFeature) continue;

                const { feature } = targetFeature;

                if (openedOverlay.value && openedOverlay.value.payload.feature !== feature) openedOverlay.value = null;

                if (type === 'hover') {
                    hoverAwaiting = true;
                    await sleep(50);
                    hoverAwaiting = false;
                    if (!selected.every(x => states[type].selectedFeatures.includes(x)) || selected.length !== states[type].selectedFeatures.length) break;
                    selectFeature(feature, true);
                }

                const result = (definition as any)[type]({
                    feature,
                    coordinate: arg.mapBrowserEvent.coordinate,
                });

                tookAction = true;

                if (type === 'hover' && result === false) {
                    mapStore.mapCursorPointerTrigger = 0;
                    continue;
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

                break;
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
    };
}

watch(map, val => {
    if (!val) return;

    const filter: FilterFunction = (feature, layer) => {
        if (!layer) return false;
        const type = layer.getProperties().type;
        const featureType = feature.getProperties().type;

        // TODO
        return type?.startsWith('airports') || (type === 'sectors-labels' && featureType !== 'sector-vatglasses') || (type === 'sectors-list' && featureType === 'sector-vatglasses');
    };

    hoverSelect = new Select({
        condition: pointerMove,
        multi: true,
        style: null,
        filter,
        /* toggleCondition: always,
      multi: true,

        features: collection,*/
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
    /* toggleCondition: always,
  multi: true,

    features: collection,*/
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
