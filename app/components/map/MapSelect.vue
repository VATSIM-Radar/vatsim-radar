<template>
    <div>
        <map-html-overlay
            class="select-result"
            :model-value="!!eventGroupType && !!lastCoords"
            :settings="{
                position: lastCoords!,
            }"
            :z-index="20"
            @update:overlay="!$event && (eventGroupType = null)"
        >
            {{features.map(x => x.getProperties())}}
        </map-html-overlay>
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
import type { Map } from 'ol';
import type { SelectEvent } from 'ol/interaction/Select.js';
import Select from 'ol/interaction/Select.js';
import { pointerMove, click, always } from 'ol/events/condition.js';
import type { PartialRecord } from '~/types';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import type { Coordinate } from 'ol/coordinate.js';
import { isMapFeature } from '~/utils/map/entities';
import type { MapFeatures, MapFeaturesType } from '~/utils/map/entities';
import MapPopupAirport from '~/components/map/popups/MapPopupAirport.vue';
import MapPopupAirportCounter from '~/components/map/popups/MapPopupAirportCounter.vue';

const map = inject<ShallowRef<Map | null>>('map')!;
let hoverSelect: Select | undefined;
let clickSelect: Select | undefined;

type EventType = 'click' | 'hover' | 'rightClick';

// TODO: replace to generic features when ready
const features = shallowRef<MapFeatures[]>([]);
const eventGroupType = ref<EventType | null>(null);
const lastCoords = ref<Coordinate | null>(null);
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
    airportLocal: {
        featureTypes: ['airport-atc'],
    },
    airportApproach: {
        featureTypes: ['airport-tracon-label', 'airport-circle-label'],
    },
    airportCounter: {
        featureTypes: ['airport-counter'],
        overlayComponent: MapPopupAirportCounter,
    },
} satisfies Record<string, Overlay>;

type OverlayKey = keyof typeof interactableElements;

const openedOverlay = shallowRef<{ key: OverlayKey; component: Component; payload: RadarEventPayload<any>; id?: string } | null>();

watch(() => mapStore.openOverlayId, id => {
    if (openedOverlay.value?.id && openedOverlay.value?.id !== id) openedOverlay.value = null;
});

function openOverlay(key: OverlayKey, payload: RadarEventPayload<any>) {
    const element = interactableElements[key];
    if (openedOverlay.value?.key === key || (openedOverlay.value?.id && openedOverlay.value?.id !== mapStore.openOverlayId) || !('overlayComponent' in element)) return;

    openedOverlay.value = {
        key,
        component: element.overlayComponent,
        payload,
    };
}

type Definition = {
    click: (payload: RadarEventPayload<any>) => void | boolean;
    featureTypes: MapFeaturesType[];
} & PartialRecord<Exclude<EventType, 'click'>, (payload: RadarEventPayload<any>) => void | boolean>;

const definitions = {
    airportControllers: {
        featureTypes: ['airport'],
        hover: payload => {
            const properties = payload.feature.getProperties();

            if (isMapFeature('airport', properties) && properties.atc.length) {
                openOverlay('airportControllers', payload);
            }
        },
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportLocal: {
        featureTypes: ['airport-atc'],
        hover: payload => openOverlay('airportControllers', payload),
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportApproach: {
        featureTypes: ['airport-tracon-label', 'airport-circle-label'],
        hover: payload => openOverlay('airportControllers', payload),
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
    airportCounter: {
        featureTypes: ['airport-counter'],
        hover: payload => openOverlay('airportCounter', payload),
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
    },
} satisfies Record<string, Definition>;

type SelectableFeatures = keyof typeof definitions;

const priorities: Record<EventType, Array<SelectableFeatures | 'multi'>> = {
    click: [
        'airportControllers',
        'airportCounter',
        'airportApproach',
        'airportLocal',
        'multi',
    ],
    hover: [
        'airportControllers', 'airportCounter', 'airportApproach', 'airportLocal',
    ],
    rightClick: ['multi'],
};

function createSelectHandler(type: EventType) {
    return (arg: SelectEvent) => {
        const changed = arg.selected;

        if (!changed.length) {
            openedOverlay.value = null;
            mapStore.mapCursorPointerTrigger = 0;
        }

        let tookAction = false;

        for (const feature of changed) {
            const properties = feature.getProperties();

            for (const priority of priorities[type]) {
                // TODO
                if (priority === 'multi') break;
                const definition = definitions[priority];

                if (!properties.type || !(type in definition) || !(definition.featureTypes as any[]).includes(properties.type)) continue;

                if (openedOverlay.value && priority !== openedOverlay.value?.key) openedOverlay.value = null;
                else if (openedOverlay.value) {
                    openedOverlay.value.payload = {
                        feature,
                        coordinate: arg.mapBrowserEvent.coordinate,
                    };
                    triggerRef(openedOverlay);
                }

                const result = (definition as any)[type]({
                    feature,
                    coordinate: arg.mapBrowserEvent.coordinate,
                });

                tookAction = true;

                if (result === false) {
                    mapStore.mapCursorPointerTrigger = 0;
                    continue;
                }

                mapStore.mapCursorPointerTrigger = 100;

                break;
            }
        }

        if (!tookAction) {
            mapStore.mapCursorPointerTrigger = 0;
            openedOverlay.value = null;
        }
    };
}

watch(map, val => {
    if (!val) return;

    hoverSelect = new Select({
        condition: pointerMove,
        hitTolerance: 4,
        style: null,
        filter: (_, layer) => {
            // TODO
            return layer.getProperties().type.startsWith('airports');
        },
        /* toggleCondition: always,
      multi: true,

        features: collection,*/
    });

    hoverSelect.on('select', createSelectHandler('hover'));

    map.value?.addInteraction(hoverSelect);

    clickSelect = new Select({
        condition: click,
        hitTolerance: 4,
        toggleCondition: always,
        style: null,
    /* toggleCondition: always,
  multi: true,

    features: collection,*/
    });

    clickSelect.on('select', createSelectHandler('click'));

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
