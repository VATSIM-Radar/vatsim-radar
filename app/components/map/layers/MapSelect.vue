<template>
    <div>
        <map-html-overlay
            v-if="contextMenu"
            is-interaction
            model-value
            persistent
            :settings="{
                position: contextMenu.coordinate,
                positioning: 'top-center',
                stopEvent: true,
            }"
            :z-index="5"
            @mouseleave="!$event.relatedTarget?.closest('#teleports') && (contextMenu = null)"
            @pointermove.stop
            @update:modelValue="contextMenu = null"
        >
            <popup-map-info
                class="select__menu"
                content-padding="0"
            >
                <ui-menu
                    item-padding="8px 12px"
                    :items="contextMenu.items"
                    @click="contextMenu = null"
                >
                    <template #default="{ item }">
                        <div class="select__container">
                            <ui-text type="3b">
                                {{item.title}}
                            </ui-text>
                            <div
                                v-if="item.key"
                                class="select__actions"
                            >
                                <template v-if="item.key === 'pilot-details'">
                                    <ui-button
                                        :href="`https://stats.vatsim.net/stats/${ item.cid }`"
                                        target="_blank"
                                        type="link"
                                        @click="contextMenu = null"
                                    >
                                        <template #icon>
                                            <stats-icon/>
                                        </template>
                                    </ui-button>
                                    <ui-button
                                        v-if="item.name"
                                        type="link"
                                    >
                                        <template #icon>
                                            <settings-favorite-list
                                                :cid="item.cid"
                                                is-popup
                                                :name="item.name"
                                            />
                                        </template>
                                    </ui-button>
                                </template>
                                <template v-if="item.key === 'pilot-route'">
                                    <ui-button
                                        type="link"
                                        @click="item.onClick"
                                    >
                                        <template #icon>
                                            <path-icon/>
                                        </template>
                                    </ui-button>
                                </template>
                                <template v-if="item.key.startsWith('pilot') && item.airport">
                                    <ui-button
                                        type="link"
                                        @click="store.metarRequest = [item.airport]"
                                    >
                                        <template #icon>
                                            <weather-icon/>
                                        </template>
                                    </ui-button>
                                </template>
                            </div>
                        </div>
                    </template>
                </ui-menu>
            </popup-map-info>
        </map-html-overlay>
        <map-html-overlay
            v-else-if="multiSelectCoordinate"
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
        <popup-fullscreen
            v-if="bookmarkOpen"
            model-value
        >
            <template #title>
                New bookmark for {{bookmarkOpen}}
            </template>
            <div class="__info-sections">
                <ui-input-text v-model="bookmarkName">
                    Name
                </ui-input-text>
                <settings-bookmark-options
                    :airport="bookmarkOpen"
                    :bookmark
                />
                <ui-button
                    :disabled="!bookmarkName || store.bookmarks.some(x => x.name.toLowerCase() === bookmarkName.toLowerCase())"
                    size="S"
                    @click="createBookmark"
                >
                    Save
                </ui-button>
            </div>
        </popup-fullscreen>
    </div>
</template>

<script lang="ts" setup>
import type { ShallowRef } from 'vue';
import type { Feature, Map } from 'ol';
import type { SelectEvent, FilterFunction } from 'ol/interaction/Select.js';
import Select from 'ol/interaction/Select.js';
import { pointerMove, always, singleClick } from 'ol/events/condition.js';
import type { Condition } from 'ol/events/condition.js';
import type { PartialRecord } from '~/types';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type {
    FeatureAirport,
    MapFeaturesType,
    FeatureAirportAtc,
    FeatureAircraft,
} from '~/utils/map/entities';
import {
    getMapFeature,
    globalMapEntities,
    isMapFeature,
} from '~/utils/map/entities';
import MapPopupAirport from '~/components/map/popups/MapPopupAirport.vue';
import MapPopupAirportCounter from '~/components/map/popups/MapPopupAirportCounter.vue';
import MapPopupAircraft from '~/components/map/popups/MapPopupAircraft.vue';
import MapPopupSigmet from '~/components/map/popups/MapPopupSigmet.vue';
import MapPopupNavigraph from '~/components/map/popups/MapPopupNavigraph.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import type { Coordinate } from 'ol/coordinate.js';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import UiMenu from '~/components/ui/data/UiMenu.vue';
import type { UIMenuItem } from '~/components/ui/data/UiMenu.vue';
import { useIsTouch } from '~/composables';
import UiText from '~/components/ui/text/UiText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import WeatherIcon from '~/assets/icons/kit/weather.svg?component';
import StatsIcon from '~/assets/icons/kit/stats.svg?component';
import PathIcon from 'assets/icons/kit/path.svg?component';
import SettingsFavoriteList from '~/components/features/settings/SettingsFavoriteList.vue';
import SettingsBookmarkOptions from '~/components/features/settings/SettingsBookmarkOptions.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { UserBookmark } from '~/utils/server/handlers/bookmarks';
import { sendUserPreset } from '~/composables/fetchers';

const map = inject<ShallowRef<Map | null>>('map')!;
let hoverSelect: Select | undefined;
let clickSelect: Select | undefined;
let rightClickSelect: Select | undefined;

function multiSelectCleanup() {
    if (multiSelectFeatures.value.length <= 1) return;

    const features = clickSelect?.getFeatures()?.getArray() ?? [];
    for (const selectedFeature of features) {
        if (!multiSelectFeatures.value.some(x => x.feature === selectedFeature)) {
            clickSelect?.deselectFeature(selectedFeature);
        }
    }

    multiSelectCoordinate.value = null;
    multiSelectFeatures.value = [];
}

const contextMenu = shallowRef<{
    coordinate: Coordinate;
    items: UIMenuItem[];
} | null>(null);
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

        if (isMapFeature('navigraph', properties)) {
            return {
                title: `Navigraph feature (${ properties.dbType })`,
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

type EventType = 'click' | 'hover' | 'rightClick';

const store = useStore();
const mapStore = useMapStore();
const bookmarkOpen = ref(null as string | null);

// TODO: refactor
const bookmarkName = ref('');
const bookmark = ref<UserBookmark>({ zoom: 14 });
const createBookmark = async () => {
    await sendUserPreset(bookmarkName.value, bookmark.value, 'bookmarks', createBookmark);
    await store.fetchBookmarks();
    bookmarkOpen.value = null;
};

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
    navigraph: {
        overlayComponent: MapPopupNavigraph,
    },
} satisfies Record<string, Overlay>;

type OverlayKey = keyof typeof interactableElements;

const openedOverlay = shallowRef<{ key: OverlayKey; interactionKey: SelectableFeatures; component: Component; payload: RadarEventPayload<any, any>; id?: string } | null>();

watch(() => mapStore.openOverlayId, id => {
    if (openedOverlay.value?.id && openedOverlay.value?.id !== id) openedOverlay.value = null;
});

function openOverlay(key: OverlayKey, payload: RadarEventPayload<any, any>, interactionKey: SelectableFeatures) {
    if (contextMenu.value) return;
    const element = interactableElements[key];
    if (openedOverlay.value?.key === key || (openedOverlay.value?.id && openedOverlay.value?.id !== mapStore.openOverlayId) || !('overlayComponent' in element)) return;

    openedOverlay.value = {
        key,
        interactionKey,
        component: element.overlayComponent,
        payload,
    };

    multiSelectCleanup();
}

type RadarEventAction = (payload: RadarEventPayload<any>) => void | boolean;

type Definition = {
    featureTypes: MapFeaturesType[];
    disableMobileHoverFallback?: boolean;
} & PartialRecord<EventType, RadarEventAction>;

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

    feature.setProperties({ selected });
    previouslySelected = feature;
    feature.changed();
}

const isMobileOrTablet = useIsTouch();

const airportContextAction: RadarEventAction = (payload: RadarEventPayload<FeatureAirport | FeatureAirportAtc>) => {
    const properties = payload.feature.getProperties();

    contextMenu.value = {
        coordinate: payload.coordinate,
        items: [
            {
                title: `${ properties.icao } Details`,
                onClick: () => mapStore.addAirportOverlay(properties.icao),
            },
            {
                title: `${ properties.icao } METAR/TAF`,
                onClick: () => store.metarRequest = [properties.icao],
            },
            {
                title: `Toggle traffic lines`,
                onClick: () => {
                    if (mapStore.overlays.some(x => x.key === properties.icao)) {
                        mapStore.overlays = mapStore.overlays.filter(x => x.key !== properties.icao);
                    }
                    else mapStore.addAirportOverlay(properties.icao, undefined, { minified: true, sticky: true, data: { showTracks: true } });
                },
            },
            {
                title: `Add ${ properties.icao } to bookmarks`,
                onClick: () => bookmarkOpen.value = properties.icao,
            },
        ],
    };
};

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
        rightClick: airportContextAction,
        disableMobileHoverFallback: true,
    },
    airportLocal: {
        featureTypes: ['airport-atc'],
        hover: payload => openOverlay('airportControllers', payload, 'airportLocal'),
        click: payload => {
            mapStore.addAirportOverlay(payload.feature.getProperties().icao);
        },
        rightClick: airportContextAction,
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
        disableMobileHoverFallback: true,
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
        disableMobileHoverFallback: true,
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
        rightClick: (payload: RadarEventPayload<FeatureAircraft>) => {
            const properties = payload.feature.getProperties();
            const pilot = useDataStore().vatsim.data.keyedPilots.value[properties.cid];

            contextMenu.value = {
                coordinate: payload.coordinate,
                items: [
                    {
                        title: `${ properties.callsign }`,
                        onClick: () => mapStore.addPilotOverlay(properties.cid),
                        cid: properties.cid,
                        name: pilot?.name,
                        key: 'pilot-details',
                    },
                    {
                        title: `Toggle DEP/ARR line`,
                        onClick: () => {
                            if (mapStore.overlays.some(x => x.key === properties.cid.toString())) {
                                mapStore.overlays = mapStore.overlays.filter(x => x.key !== properties.cid.toString());
                            }
                            else mapStore.addPilotOverlay(properties.cid, undefined, { minified: true, sticky: true });
                        },
                        key: 'pilot-route',
                    },
                    ...(pilot && pilot.departure && pilot.arrival
                        ? [
                            {
                                title: `${ pilot.departure } details`,
                                onClick: () => mapStore.addAirportOverlay(pilot.departure!),
                                key: 'pilot-departure',
                                airport: pilot.departure,
                            },
                            {
                                title: `${ pilot.arrival } details`,
                                onClick: () => mapStore.addAirportOverlay(pilot.arrival!),
                                key: 'pilot-arrival',
                                airport: pilot.arrival,
                            },
                        ]
                        : []),
                ],
            };
        },
        disableMobileHoverFallback: true,
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
        disableMobileHoverFallback: true,
    },
    navigraph: {
        featureTypes: ['navigraph'],
        hover: payload => {
            return !!payload.feature.getProperties().key;
        },
        click: payload => {
            if (!payload.feature.getProperties().key) return false;

            return openOverlay('navigraph', payload, 'navigraph');
        },
        disableMobileHoverFallback: true,
    },
} satisfies Record<SelectableFeatures, Definition>;

type SelectableFeatures =
    | 'airportControllers'
    | 'airportLocal'
    | 'airportApproach'
    | 'airportCounter'
    | 'sector'
    | 'sectorVG'
    | 'aircraft'
    | 'sigmet'
    | 'distance'
    | 'navigraph';

const states: Record<EventType, { priorities: Array<SelectableFeatures | 'multi'>; multiSelect: PartialRecord<SelectableFeatures, { title: string; priority?: number }>; selectedFeatures: Ref<Feature[]> }> = {
    hover: {
        priorities: [
            'sector',
            'airportControllers',
            'airportCounter',
            'airportApproach',
            'airportLocal',
            'aircraft',
            'sectorVG',
            'sigmet',
            'distance',
            'navigraph',
        ],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
    click: {
        priorities: [
            'distance',
            'sector',
            'airportControllers',
            'airportLocal',
            'airportCounter',
            'airportApproach',
            'aircraft',
            'multi',
            'sectorVG',
            'sigmet',
            'navigraph',
        ],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
    rightClick: {
        priorities: ['airportLocal', 'airportControllers', 'aircraft'],
        multiSelect: {},
        selectedFeatures: shallowRef([]),
    },
};

let hoverAwaiting = false;

watch(contextMenu, val => {
    if (!val) rightClickSelect?.clearSelection();
});

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
                            map.value!.getTargetElement().style.cursor = 'grab';
                            openedOverlay.value = null;
                            selectFeature(false);
                        }
                    });
                }

                selectFeature(false);
            }

            if (!arg.mapBrowserEvent || (type === 'hover' && isMobileOrTablet.value)) return;

            let tookAction = false;
            let multiselect = false;

            const featuresWithProperties = selected.map(x => ({
                feature: x,
                properties: x.getProperties(),
            }));

            async function featureAction(feature: Feature, definition: Definition) {
                if (openedOverlay.value && openedOverlay.value.payload.feature !== feature) openedOverlay.value = null;

                if (isMobileOrTablet.value) {
                    selectFeature(feature, true);
                }

                if (type === 'hover' && !isMobileOrTablet.value) {
                    hoverAwaiting = true;
                    await sleep(50);
                    hoverAwaiting = false;

                    if (!selected.length || !selected.every(x => states[type].selectedFeatures.value.includes(x)) || selected.length !== states[type].selectedFeatures.value.length) return;

                    selectFeature(feature, true);
                }

                const result = (definition as any)[(isMobileOrTablet.value && !definition.disableMobileHoverFallback) ? 'hover' : type]({
                    feature,
                    coordinate: arg.mapBrowserEvent.coordinate,
                });

                tookAction = true;

                if (result === false) {
                    map.value!.getTargetElement().style.cursor = 'grab';
                    return false;
                }

                if (type === 'hover') {
                    map.value!.getTargetElement().style.cursor = 'pointer';
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
                    if (priority === 'multi') {
                        multiselect = true;

                        continue;
                    }

                    const definition = definitions[priority];

                    if (!(type in definition) && (!isMobileOrTablet.value || !definition.hover)) continue;

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
                        multiSelectCleanup();
                        return;
                    }

                    multiSelectCoordinate.value = arg.mapBrowserEvent.coordinate;

                    return;
                }
            }

            if (!tookAction) {
                if (type === 'hover') {
                    map.value!.getTargetElement().style.cursor = 'grab';
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
    if (!val || hoverSelect) return;

    const filter: FilterFunction = (feature, layer) => {
        if (!layer) return false;
        const type = layer.getProperties().type;
        const featureType = feature.getProperties().type;
        const selectable = layer.getProperties().selectable;

        // TODO
        return selectable || (type?.startsWith('airports') && featureType !== 'airport-tracon' && featureType !== 'airport-circle') || (type === 'sectors-labels' && featureType !== 'sector-vatglasses') || (type === 'sectors-list' && featureType === 'sector-vatglasses');
    };

    hoverSelect = new Select({
        condition: pointerMove,
        multi: true,
        style: null,
        hitTolerance: 3,
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

    map.value?.addInteraction(clickSelect);

    const rightClickCondition: Condition = event => {
        return event.type === 'contextmenu';
    };

    rightClickSelect = new Select({
        condition: rightClickCondition,
        hitTolerance: 10,
        multi: true,
        style: null,
        toggleCondition: always,
        filter,
    });

    rightClickSelect.on('select', createSelectHandler('rightClick', clickSelect));

    watch(openedOverlay, val => {
        if (!val) {
            clickSelect?.clearSelection();
        }
    });

    map.value?.addInteraction(rightClickSelect);

    map.value?.getViewport().addEventListener('contextmenu', e => {
        e.preventDefault();
    });
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

    if (rightClickSelect) {
        rightClickSelect?.dispose();
        map.value?.removeInteraction(rightClickSelect);
    }
});
</script>

<style lang="scss" scoped>
.select-result {
    display: block;
}

.select__container {
    display: flex;
    gap: 8px;
    justify-content: space-between;
}

.select__actions {
    display: flex;
    gap: 4px;
}

.select__menu {
    overflow: hidden;
}
</style>
