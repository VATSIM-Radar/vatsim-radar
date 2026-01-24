<template>
    <div class="layers __info-sections">
        <ui-tabs
            v-model="tab"
            mobile-vertical
            :tabs="{ layers: { title: 'Layers' }, sigmets: { title: 'SIGMETs' }, navigraph: { title: 'Navigraph' } }"
        />
        <template v-if="tab === 'layers'">
            <!--
        <template v-if="!store.localSettings.filters?.layers?.layer || store.localSettings.filters?.layers?.layer?.startsWith('protoData')">
            <common-toggle
                v-if="!store.localSettings.filters?.layers?.layer || store.localSettings.filters?.layers?.layer?.startsWith('protoData')"
                :disabled="store.getCurrentTheme === 'default'"
                :model-value="store.localSettings.filters?.layers?.layer === 'protoDataGray'"
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
                        :model-value="store.localSettings.disableNavigraph !== true"
                        @update:modelValue="setUserLocalSettings({ disableNavigraph: !$event })"
                    >
                        Navigraph Layers
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="store.localSettings.disableNavigraphRoute !== true"
                        @update:modelValue="setUserLocalSettings({ disableNavigraphRoute: !$event })"
                    >
                        Route parsing
                    </ui-toggle>
                </template>
            </ui-columns-display>

            <ui-columns-display align-items="flex-start">
                <template #col1>
                    <ui-toggle
                        :model-value="!!store.localSettings.filters?.layers?.sigmets?.enabled"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { enabled: $event } } } })"
                    >
                        SIGMETs
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="!!store.localSettings.natTrak?.enabled"
                        @update:modelValue="setUserLocalSettings({ natTrak: { enabled: $event } })"
                    >
                        NAT Tracks
                    </ui-toggle>
                </template>
            </ui-columns-display>
            <ui-columns-display
                v-if="!!store.localSettings.natTrak?.enabled"
                align-items="flex-start"
            >
                <template #col1>
                    <ui-toggle
                        :model-value="!!store.localSettings.natTrak?.showConcorde"
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
                        :model-value="store.localSettings.natTrak?.direction ?? 'all'"
                        @update:modelValue="setUserLocalSettings({ natTrak: { direction: $event as any } })"
                    >
                        <template #label>
                            Tracks Direction
                        </template>
                    </ui-select>
                </template>
            </ui-columns-display>

            <ui-columns-display>
                <template #col1>
                    <ui-toggle
                        :disabled="!radarIsDefault"
                        :model-value="store.localSettings.filters?.layers?.layerLabels ?? true"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { layerLabels: $event } } })"
                    >
                        Show labels
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-toggle
                        :model-value="!!store.localSettings.filters?.layers?.terminator"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { terminator: $event } } })"
                    >
                        Day/Night line
                    </ui-toggle>
                </template>
            </ui-columns-display>

            <ui-notification
                cookie-name="layers-tutorial"
                type="info"
            >
                Light and Detailed have worse performance than other layers
            </ui-notification>

            <settings-transparency
                v-if="store.localSettings.filters?.layers?.layer === 'OSM'"
                setting="osm"
            />
            <settings-transparency
                v-else-if="store.localSettings.filters?.layers?.layer === 'Satellite' || store.localSettings.filters?.layers?.layer === 'SatelliteEsri'"
                setting="satellite"
            />
            <ui-radio-group
                :items="mapLayers"
                :model-value="store.localSettings.filters?.layers?.layer ?? 'protoData'"
                @update:modelValue="changeLayer($event as MapLayoutLayer)"
            />

            <template v-if="!isMobile">
                <ui-block-title remove-margin>
                    Relative Distance Indicator
                </ui-block-title>
                <ui-toggle
                    :model-value="store.localSettings.filters?.layers?.relativeIndicator !== false"
                    @update:modelValue="setUserLocalSettings({ filters: { layers: { relativeIndicator: $event } } })"
                >
                    Relative distance indicator
                </ui-toggle>
                <ui-select
                    v-if="store.localSettings.filters?.layers?.relativeIndicator !== false"
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
                    :model-value="typeof store.localSettings.filters?.layers?.relativeIndicator === 'string' ? store.localSettings.filters?.layers?.relativeIndicator : 'metric'"
                    @update:modelValue="setUserLocalSettings({ filters: { layers: { relativeIndicator: $event as Units } } })"
                >
                    <template #label>
                        Distance unit
                    </template>
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
                    :model-value="!!store.localSettings.distance?.enabled"
                    @update:modelValue="setUserLocalSettings({ distance: { enabled: $event } })"
                >
                    Enable
                </ui-toggle>
                <ui-select
                    v-if="store.localSettings.filters?.layers?.relativeIndicator !== false"
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
                    :model-value="store.localSettings.distance?.units ?? 'nautical'"
                    @update:modelValue="setUserLocalSettings({ distance: { units: $event as Units } })"
                >
                    <template #label>
                        Distance unit
                    </template>
                </ui-select>
                <ui-toggle
                    :model-value="!!store.localSettings.distance?.ctrlClick"
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
                :model-value="!!store.localSettings.filters?.layers?.sigmets?.enabled"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { enabled: $event } } } })"
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
                v-if="store.localSettings.filters?.layers?.sigmets?.enabled"
                :items="sigmetDatesList"
                :model-value="store.localSettings.filters?.layers?.sigmets?.activeDate ?? 'current'"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { activeDate: $event as string } } } })"
            >
                <template #label>
                    Active date
                </template>
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
                :model-value="store.localSettings.disableNavigraph !== true"
                @update:modelValue="setUserLocalSettings({ disableNavigraph: !$event })"
            >
                Enabled
            </ui-toggle>
            <ui-toggle
                :model-value="store.localSettings.disableNavigraphRoute !== true"
                @update:modelValue="setUserLocalSettings({ disableNavigraphRoute: !$event })"
            >
                Enable route parsing
            </ui-toggle>
            <ui-toggle
                :model-value="store.localSettings.disableNavigraphRouteHover !== true"
                @update:modelValue="setUserLocalSettings({ disableNavigraphRouteHover: !$event })"
            >
                Route parsing on hover
            </ui-toggle>

            <ui-block-title remove-margin>
                Airways
            </ui-block-title>
            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.enabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { enabled: $event } } })"
                >
                    Airways
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.showAirwaysLabel ?? true"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showAirwaysLabel: $event } } })"
                >
                    Airways labels
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.showWaypointsLabel ?? true"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showWaypointsLabel: $event } } })"
                >
                    Airway waypoints labels
                </ui-toggle>
            </div>
            <ui-block-title remove-margin/>
            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.ndb"
                    @update:modelValue="setUserMapSettings({ navigraphData: { ndb: $event } })"
                >
                    NDB
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.vordme"
                    @update:modelValue="setUserMapSettings({ navigraphData: { vordme: $event } })"
                >
                    VORDME
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.waypoints"
                    @update:modelValue="setUserMapSettings({ navigraphData: { waypoints: $event } })"
                >
                    Waypoints
                </ui-toggle>
                <ui-toggle
                    :disabled="!store.mapSettings.navigraphData?.waypoints"
                    :model-value="store.mapSettings.navigraphData?.terminalWaypoints"
                    @update:modelValue="setUserMapSettings({ navigraphData: { terminalWaypoints: $event } })"
                >
                    Terminal Waypoints
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.navigraphData?.holdings"
                    @update:modelValue="setUserMapSettings({ navigraphData: { holdings: $event } })"
                >
                    Holdings
                </ui-toggle>
                <ui-toggle
                    v-if="store.user"
                    :model-value="store.mapSettings.navigraphData?.mode === 'vfr' ? false : store.mapSettings.navigraphData?.isModeAuto ?? true"
                    @update:modelValue="[setUserMapSettings({ navigraphData: { isModeAuto: $event } }), store.mapSettings.navigraphData?.mode === 'vfr' && setUserMapSettings({ navigraphData: { mode: 'ifrHigh' } })]"
                >
                    Automatic IFR level
                </ui-toggle>
            </div>
            <ui-notification
                cookie-name="ifr-tutorial"
                type="info"
            >
                Affects airways and holdings
            </ui-notification>
            <ui-radio-group
                :items="[{ value: 'ifrHigh', text: 'IFR High' }, { value: 'ifrLow', text: 'IFR Low' }, { value: 'both', text: 'Both' }]"
                :model-value="store.mapSettings.navigraphData?.mode ?? 'both'"
                @update:modelValue="setUserMapSettings({ navigraphData: { mode: $event as any } })"
            />
            <template v-if="!store.localSettings.disableNavigraphRoute">
                <ui-block-title remove-margin>
                    Airport Tracks
                </ui-block-title>
                <ui-columns-display>
                    <template #col1>
                        <ui-toggle
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.enabled !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { enabled: $event } })"
                        >
                            Enabled
                        </ui-toggle>
                        <ui-toggle
                            :disabled="store.localSettings.navigraphRouteAirportOverlay?.enabled === false"
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.sid !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { sid: $event } })"
                        >
                            Auto-SID parsing
                        </ui-toggle>
                        <ui-toggle
                            :disabled="store.localSettings.navigraphRouteAirportOverlay?.enabled === false"
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.star !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { star: $event } })"
                        >
                            Auto-STAR parsing
                        </ui-toggle>
                    </template>
                    <template #col2>
                        <ui-toggle
                            :disabled="store.localSettings.navigraphRouteAirportOverlay?.enabled === false"
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.holds !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { holds: $event } })"
                        >
                            Holdings
                        </ui-toggle>
                        <ui-toggle
                            :disabled="store.localSettings.navigraphRouteAirportOverlay?.enabled === false"
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.labels !== false"
                            @update:modelValue="setUserLocalSettings({ navigraphRouteAirportOverlay: { labels: $event } })"
                        >
                            Labels
                        </ui-toggle>
                        <ui-toggle
                            :disabled="store.localSettings.navigraphRouteAirportOverlay?.enabled === false"
                            :model-value="store.localSettings.navigraphRouteAirportOverlay?.waypoints !== false"
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

const radarIsDefault = computed(() => !mapLayers.some(x => x.value === store.localSettings.filters?.layers?.layer) ||
    store.localSettings.filters?.layers?.layer?.startsWith('proto') ||
    store.localSettings.filters?.layers?.layer === 'Satellite' ||
    (store.localSettings.filters?.layers?.layer === 'OSM' && store.theme !== 'light'));

const changeLayer = (layer: MapLayoutLayer) => {
    setUserLocalSettings({ filters: { layers: { layer } } });
};

watch(() => String(store.localSettings.navigraphRouteAirportOverlay?.sid) + String(store.localSettings.navigraphRouteAirportOverlay?.star), () => {
    useDataStore().navigraphWaypoints.value = {};
});

watch(() => store.mapSettings.navigraphData, () => {
    checkForNavigraph();
}, {
    deep: true,
});

const sigmetDatesList = sigmetDates();
</script>
