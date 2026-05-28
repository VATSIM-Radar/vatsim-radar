<template>
    <div class="layers __info-sections">
        <ui-tabs
            v-model="tab"
            mobile-vertical
            :tabs="{ layers: { title: 'Layers' }, sigmets: { title: 'SIGMETs' }, navigraph: { title: 'Navigraph' } }"
        />
        <template v-if="tab === 'layers'">
            <!--
        <template v-if="!mapLayer || mapLayer?.startsWith('protoData')">
            <common-toggle
                v-if="!mapLayer || mapLayer?.startsWith('protoData')"
                :disabled="store.getCurrentTheme === 'default'"
                :model-value="mapLayer === 'protoDataGray'"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { layer: !$event ? 'protoData' : 'protoDataGray' } } })"
            >
                Grayscale

                <template
                    v-if="store.getCurrentTheme === 'default'"
                    #description
                >
                    Light theme only
                </template>
            </common-toggle>
        </template>
-->

            <ui-block-title remove-margin>
                Map Layers
            </ui-block-title>

            <ui-columns-display>
                <template #col1>
                    <ui-toggle
                        :model-value="navigraphEnabled !== false"
                        @update:modelValue="setUserLocalSettings({ disableNavigraph: !$event })"
                    >
                        Navigraph Layers
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="navigraphRouteParsingEnabled !== false"
                        @update:modelValue="setUserLocalSettings({ disableNavigraphRoute: !$event })"
                    >
                        Route parsing
                    </ui-toggle>
                </template>
            </ui-columns-display>

            <ui-columns-display align-items="flex-start">
                <template #col1>
                    <ui-toggle
                        :model-value="sigmetsShowOnMap"
                        @update:modelValue="setSettingByKey('sigmets.showOnMap', $event)"
                    >
                        SIGMETs
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="!!natTrakEnabled"
                        @update:modelValue="setUserLocalSettings({ natTrak: { enabled: $event } })"
                    >
                        NAT Tracks
                    </ui-toggle>
                </template>
            </ui-columns-display>
            <ui-columns-display
                v-if="!!natTrakEnabled"
                align-items="flex-start"
            >
                <template #col1>
                    <ui-toggle
                        :model-value="!!natTrakConcorde"
                        @update:modelValue="setUserLocalSettings({ natTrak: { showConcorde: $event } })"
                    >
                        Concorde tracks
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-select
                        :items="[
                            { value: 'all', text: 'All' },
                            { value: 'east', text: 'East' },
                            { value: 'west', text: 'West' },
                        ]"
                        :model-value="natTrakDirection"
                        @update:modelValue="setUserLocalSettings({ natTrak: { direction: $event as any } })"
                    >
                        Tracks Direction
                    </ui-select>
                </template>
            </ui-columns-display>

            <ui-columns-display>
                <template #col1>
                    <ui-toggle
                        :disabled="!radarIsDefault"
                        :model-value="layerLabels"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { layerLabels: $event } } })"
                    >
                        Show labels
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="!!terminatorEnabled"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { terminator: $event } } })"
                    >
                        Day/Night line
                    </ui-toggle>
                </template>
            </ui-columns-display>

            <ui-notification
                remember-message="LAYERS_TUTORIAL"
                type="info"
            >
                Light and Detailed have worse performance than other layers
            </ui-notification>

            <settings-transparency
                v-if="mapLayer === 'OSM'"
                setting="osm"
            />
            <settings-transparency
                v-else-if="mapLayer === 'Satellite' || mapLayer === 'SatelliteEsri'"
                setting="satellite"
            />
            <ui-radio-group
                :items="mapLayers"
                :model-value="mapLayer"
                @update:modelValue="changeLayer($event as MapLayoutLayer)"
            />

            <template v-if="!isMobile">
                <ui-block-title remove-margin>
                    Relative Distance Indicator
                </ui-block-title>
                <ui-toggle
                    :model-value="relativeIndicator !== false"
                    @update:modelValue="setUserLocalSettings({ filters: { layers: { relativeIndicator: $event } } })"
                >
                    Relative distance indicator
                </ui-toggle>
                <ui-select
                    v-if="relativeIndicator !== false"
                    :items="[
                        {
                            value: 'degrees',
                            text: 'Degrees',
                        },
                        {
                            value: 'imperial',
                            text: 'Imperial (mi)',
                        },
                        {
                            value: 'nautical',
                            text: 'Nautical (NM)',
                        },
                        {
                            value: 'metric',
                            text: 'Metric (km)',
                        },
                    ]"
                    :model-value="typeof relativeIndicator === 'string' ? relativeIndicator : 'metric'"
                    @update:modelValue="setUserLocalSettings({ filters: { layers: { relativeIndicator: $event as Units } } })"
                >
                    Distance unit
                </ui-select>
                <ui-block-title remove-margin>
                    Distance tool
                </ui-block-title>
                <ui-button
                    size="S"
                    type="secondary"
                    @click="mapStore.distance.tutorial = true"
                >
                    Click to read tutorial and disclaimers
                </ui-button>
                <ui-toggle
                    :model-value="!!distanceEnabled"
                    @update:modelValue="setUserLocalSettings({ distance: { enabled: $event } })"
                >
                    Enable
                </ui-toggle>
                <ui-select
                    v-if="relativeIndicator !== false"
                    :items="[
                        {
                            value: 'imperial',
                            text: 'Imperial (mi)',
                        },
                        {
                            value: 'nautical',
                            text: 'Nautical (NM)',
                        },
                        {
                            value: 'metric',
                            text: 'Metric (km)',
                        },
                    ]"
                    :model-value="distanceUnits"
                    @update:modelValue="setUserLocalSettings({ distance: { units: $event as Units } })"
                >
                    Distance unit
                </ui-select>
                <ui-toggle
                    :model-value="distanceInteraction === 'ctrlclick'"
                    @update:modelValue="setUserLocalSettings({ distance: { ctrlClick: $event } })"
                >
                    Control click
                    <template #description>
                        Use CTRL+Click instead of Double Click.<br> Re-enables double-click-to-zoom
                    </template>
                </ui-toggle>
            </template>
        </template>
        <template v-else-if="tab === 'sigmets'">
            <ui-toggle
                :model-value="sigmetsShowOnMap"
                @update:modelValue="setSettingByKey('sigmets.showOnMap', $event)"
            >
                Enable
            </ui-toggle>
            <ui-button
                size="S"
                to="/sigmets"
                type="secondary"
            >
                View on separate page
            </ui-button>
            <ui-radio-group
                v-if="sigmetsShowOnMap"
                :items="sigmetDatesList"
                :model-value="sigmetsActiveDate"
                @update:modelValue="sigmetsActiveDate = $event as string"
            >
                Active date
            </ui-radio-group>
            <settings-sigmets/>
            <div class="__partner-info">
                <div class="__partner-info_image">
                    <img
                        alt="NWS"
                        src="../../../../assets/images/NWS-logo.svg"
                    >
                </div>
                <span>
                    Data provided by <a
                        class="__link"
                        href="https://aviationweather.gov/"
                        target="_blank"
                    >Aviation Weather Center</a>
                </span>
            </div>
        </template>
        <template v-else-if="tab === 'navigraph'">
            <ui-toggle
                :model-value="navigraphEnabled !== false"
                @update:modelValue="setUserLocalSettings({ disableNavigraph: !$event })"
            >
                Enabled
            </ui-toggle>
            <ui-toggle
                :model-value="navigraphRouteParsingEnabled !== false"
                @update:modelValue="setUserLocalSettings({ disableNavigraphRoute: !$event })"
            >
                Enable route parsing
            </ui-toggle>
            <ui-toggle
                :model-value="navigraphRouteParsingHoverEnabled !== false"
                @update:modelValue="setUserLocalSettings({ disableNavigraphRouteHover: !$event })"
            >
                Route parsing on hover
            </ui-toggle>

            <ui-block-title remove-margin>
                Airways
            </ui-block-title>
            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="airwaysEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { enabled: $event } } })"
                >
                    Airways
                </ui-toggle>
                <ui-toggle
                    :model-value="airwaysLabels"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showAirwaysLabel: $event } } })"
                >
                    Airways labels
                </ui-toggle>
                <ui-toggle
                    :model-value="airwayWaypointsLabels"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showWaypointsLabel: $event } } })"
                >
                    Airway waypoints labels
                </ui-toggle>
            </div>
            <ui-block-title remove-margin/>
            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="ndbEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { ndb: $event } })"
                >
                    NDB
                </ui-toggle>
                <ui-toggle
                    :model-value="vordmeEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { vordme: $event } })"
                >
                    VORDME
                </ui-toggle>
                <ui-toggle
                    :model-value="waypointsEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { waypoints: $event } })"
                >
                    Waypoints
                </ui-toggle>
                <ui-toggle
                    :disabled="!waypointsEnabled"
                    :model-value="terminalWaypointsEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { terminalWaypoints: $event } })"
                >
                    Terminal Waypoints
                </ui-toggle>
                <ui-toggle
                    :model-value="holdingsEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { holdings: $event } })"
                >
                    Holdings
                </ui-toggle>
                <ui-toggle
                    v-if="store.user"
                    :model-value="ifrMode === 'vfr' ? false : ifrAuto"
                    @update:modelValue="[setUserMapSettings({ navigraphData: { isModeAuto: $event } }), ifrMode === 'vfr' && setUserMapSettings({ navigraphData: { mode: 'ifrHigh' } })]"
                >
                    Automatic IFR level
                </ui-toggle>
            </div>
            <ui-notification
                remember-message="IFR_TUTORIAL"
                type="info"
            >
                Affects airways and holdings
            </ui-notification>
            <ui-radio-group
                :items="[{ value: 'ifrHigh', text: 'IFR High' }, { value: 'ifrLow', text: 'IFR Low' }, { value: 'both', text: 'Both' }]"
                :model-value="ifrMode"
                @update:modelValue="setUserMapSettings({ navigraphData: { mode: $event as any } })"
            />
            <template v-if="navigraphRouteParsingEnabled !== false">
                <ui-block-title remove-margin>
                    Airport Tracks
                </ui-block-title>
                <ui-columns-display>
                    <template #col1>
                        <ui-toggle
                            :model-value="airportOverlayEnabled !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { enabled: $event } })"
                        >
                            Enabled
                        </ui-toggle>
                        <ui-toggle
                            :disabled="airportOverlayEnabled === false"
                            :model-value="airportOverlaySid !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { sid: $event } })"
                        >
                            Auto-SID parsing
                        </ui-toggle>
                        <ui-toggle
                            :disabled="airportOverlayEnabled === false"
                            :model-value="airportOverlayStar !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { star: $event } })"
                        >
                            Auto-STAR parsing
                        </ui-toggle>
                    </template>
                    <template #col2>
                        <ui-toggle
                            :disabled="airportOverlayEnabled === false"
                            :model-value="airportOverlayHolds !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { holds: $event } })"
                        >
                            Holdings
                        </ui-toggle>
                        <ui-toggle
                            :disabled="airportOverlayEnabled === false"
                            :model-value="airportOverlayLabels !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { labels: $event } })"
                        >
                            Labels
                        </ui-toggle>
                        <ui-toggle
                            :disabled="airportOverlayEnabled === false"
                            :model-value="airportOverlayWaypoints !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { waypoints: $event } })"
                        >
                            Waypoints
                        </ui-toggle>
                    </template>
                </ui-columns-display>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import UiTabs from '~/components/ui/data/UiTabs.vue';
import type { Units } from 'ol/control/ScaleLine.js';
import type { MapLayoutLayer, MapLayoutLayerExternalOptions } from '~/types/map';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import SettingsTransparency from '~/components/features/settings/SettingsTransparency.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import { useStore } from '~/store';
import { isProductionMode } from '~/utils/shared';
import SettingsSigmets from '~/components/features/settings/SettingsSigmets.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { sigmetDates } from '~/composables';
import { useMapStore } from '~/store/map';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';

defineProps({});
const store = useStore();
const mapStore = useMapStore();
const tab = ref('layers');
const isMobile = useIsMobile();

let mapLayers: RadioItemGroup<MapLayoutLayerExternalOptions>[] = [
    {
        value: 'protoData',
        text: 'Light',
    },
    {
        value: 'protoGeneral',
        text: 'Detailed',
    },
    {
        value: 'basic',
        text: 'Basic',
    },
    {
        value: 'Satellite',
        text: 'Satellite (USA only)',
        hint: 'Lacks quality data outside US. Will be noticeable when zooming',
        hintLocation: 'right',
    },
    {
        value: 'SatelliteEsri',
        text: 'Satellite (Esri)',
    },
    {
        value: 'OSM',
        hint: 'Will only show for light theme',
        hintLocation: 'left',
    },
];

if (isProductionMode()) mapLayers = mapLayers.filter(x => x.value !== 'SatelliteEsri');

const radarIsDefault = computed(() => {
    const layer = getKeyedValueFromSettings('map.layers.layer');

    return !mapLayers.some(x => x.value === layer) ||
        layer?.startsWith('proto') ||
        layer === 'Satellite' ||
        (layer === 'OSM' && store.theme !== 'light');
});

const changeLayer = (layer: MapLayoutLayer) => {
    setSettingByKey('map.layers.layer', layer);
};

watch(() => String(getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.sid')) + String(getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.star')), () => {
    useDataStore().navigraphWaypoints.value = {};
});

watch(() => JSON.stringify([
    getKeyedValueFromSettings('map.navigraph.layers.airways.enabled'),
    getKeyedValueFromSettings('map.navigraph.layers.airways.showAirwaysLabel'),
    getKeyedValueFromSettings('map.navigraph.layers.airways.showWaypointsLabel'),
    getKeyedValueFromSettings('map.navigraph.layers.ndb'),
    getKeyedValueFromSettings('map.navigraph.layers.vordme'),
    getKeyedValueFromSettings('map.navigraph.layers.waypoints'),
    getKeyedValueFromSettings('map.navigraph.layers.terminalWaypoints'),
    getKeyedValueFromSettings('map.navigraph.layers.holdings'),
    getKeyedValueFromSettings('map.navigraph.layers.ifrMode'),
    getKeyedValueFromSettings('map.navigraph.layers.ifrAuto'),
]), () => {
    checkForNavigraph();
});

const sigmetDatesList = sigmetDates();
const sigmetsShowOnMap = useSettingValueFromFunc('sigmets.showOnMap');
const sigmetsActiveDate = computed({
    get: () => store.localSettings.sigmetsDate ?? 'current',
    set: (value: string) => setUserLocalSettings({ sigmetsDate: value }),
});
const navigraphEnabled = useSettingValueFromFunc('map.navigraph.enabled');
const navigraphRouteParsingEnabled = useSettingValueFromFunc('map.navigraph.routeParsing.enabled');
const navigraphRouteParsingHoverEnabled = useSettingValueFromFunc('map.navigraph.routeParsing.enabledOnHover');
const natTrakEnabled = useSettingValueFromFunc('map.layers.natTrak.enabled');
const natTrakConcorde = useSettingValueFromFunc('map.layers.natTrak.concorde');
const natTrakDirection = useSettingValueFromFunc('map.layers.natTrak.direction');
const layerLabels = useSettingValueFromFunc('map.layers.layerLabels');
const mapLayer = useSettingValueFromFunc('map.layers.layer');
const terminatorEnabled = useSettingValueFromFunc('map.layers.terminator');
const relativeIndicator = useSettingValueFromFunc('map.layers.relativeIndicator');
const distanceEnabled = useSettingValueFromFunc('map.layers.distance.enabled');
const distanceUnits = useSettingValueFromFunc('map.layers.distance.units');
const distanceInteraction = useSettingValueFromFunc('map.layers.distance.interaction');
const airwaysEnabled = useSettingValueFromFunc('map.navigraph.layers.airways.enabled');
const airwaysLabels = useSettingValueFromFunc('map.navigraph.layers.airways.showAirwaysLabel');
const airwayWaypointsLabels = useSettingValueFromFunc('map.navigraph.layers.airways.showWaypointsLabel');
const ndbEnabled = useSettingValueFromFunc('map.navigraph.layers.ndb');
const vordmeEnabled = useSettingValueFromFunc('map.navigraph.layers.vordme');
const waypointsEnabled = useSettingValueFromFunc('map.navigraph.layers.waypoints');
const terminalWaypointsEnabled = useSettingValueFromFunc('map.navigraph.layers.terminalWaypoints');
const holdingsEnabled = useSettingValueFromFunc('map.navigraph.layers.holdings');
const ifrAuto = useSettingValueFromFunc('map.navigraph.layers.ifrAuto');
const ifrMode = useSettingValueFromFunc('map.navigraph.layers.ifrMode');
const airportOverlayEnabled = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.enabled');
const airportOverlaySid = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.sid');
const airportOverlayStar = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.star');
const airportOverlayHolds = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.holds');
const airportOverlayLabels = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.labels');
const airportOverlayWaypoints = useSettingValueFromFunc('map.navigraph.routeParsing.airportOverlay.waypoints');
</script>
