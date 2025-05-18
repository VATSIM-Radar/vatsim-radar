<template>
    <div class="layers __info-sections">
        <common-tabs
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

            <common-block-title remove-margin>
                Map Layers
            </common-block-title>

            <common-toggle
                :disabled="!radarIsDefault"
                :model-value="store.localSettings.filters?.layers?.layerLabels ?? true"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { layerLabels: $event } } })"
            >
                Show labels
            </common-toggle>

            <common-notification
                cookie-name="layers-tutorial"
                type="info"
            >
                Light and Detailed have worse performance than other layers
            </common-notification>

            <map-filter-transparency
                v-if="store.localSettings.filters?.layers?.layer === 'OSM'"
                setting="osm"
            />
            <map-filter-transparency
                v-else-if="store.localSettings.filters?.layers?.layer === 'Satellite' || store.localSettings.filters?.layers?.layer === 'SatelliteEsri'"
                setting="satellite"
            />
            <common-radio-group
                :items="mapLayers"
                :model-value="store.localSettings.filters?.layers?.layer ?? 'protoData'"
                @update:modelValue="changeLayer($event as MapLayoutLayer)"
            />

            <common-block-title remove-margin>
                Relative Distance Indicator
            </common-block-title>
            <common-toggle
                :model-value="store.localSettings.filters?.layers?.relativeIndicator !== false"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { relativeIndicator: $event } } })"
            >
                Relative distance indicator
            </common-toggle>
            <common-select
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
                    Distance unit
                </template>
            </common-select>
        </template>
        <template v-else-if="tab === 'sigmets'">
            <common-toggle
                :model-value="!!store.localSettings.filters?.layers?.sigmets?.enabled"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { enabled: $event } } } })"
            >
                Enable
            </common-toggle>
            <common-button
                size="S"
                to="/sigmets"
                type="secondary"
            >
                View on separate page
            </common-button>
            <common-radio-group
                v-if="store.localSettings.filters?.layers?.sigmets?.enabled"
                :items="sigmetDatesList"
                :model-value="store.localSettings.filters?.layers?.sigmets?.activeDate ?? 'current'"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { activeDate: $event as string } } } })"
            >
                <template #label>
                    Active date
                </template>
            </common-radio-group>
            <common-sigmets-settings/>
            <div class="__partner-info">
                <div class="__partner-info_image">
                    <img
                        alt="NWS"
                        src="~/assets/images/NWS-logo.svg"
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
            <common-block-title remove-margin>
                Airways
            </common-block-title>
            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.enabled"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { enabled: $event } } })"
                >
                    Airways
                </common-toggle>
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.showAirwaysLabel ?? true"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showAirwaysLabel: $event } } })"
                >
                    Airways labels
                </common-toggle>
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.airways?.showWaypointsLabel ?? true"
                    @update:modelValue="setUserMapSettings({ navigraphData: { airways: { showWaypointsLabel: $event } } })"
                >
                    Airway waypoints labels
                </common-toggle>
            </div>
            <common-block-title remove-margin/>
            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.ndb"
                    @update:modelValue="setUserMapSettings({ navigraphData: { ndb: $event } })"
                >
                    NDB
                </common-toggle>
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.vordme"
                    @update:modelValue="setUserMapSettings({ navigraphData: { vordme: $event } })"
                >
                    VORDME
                </common-toggle>
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.waypoints"
                    @update:modelValue="setUserMapSettings({ navigraphData: { waypoints: $event } })"
                >
                    Waypoints
                </common-toggle>
                <common-toggle
                    :model-value="store.mapSettings.navigraphData?.holdings"
                    @update:modelValue="setUserMapSettings({ navigraphData: { holdings: $event } })"
                >
                    Holdings
                </common-toggle>
                <common-toggle
                    v-if="store.user"
                    :model-value="store.mapSettings.navigraphData?.mode === 'vfr' ? false : store.mapSettings.navigraphData?.isModeAuto ?? true"
                    @update:modelValue="[setUserMapSettings({ navigraphData: { isModeAuto: $event } }), store.mapSettings.navigraphData?.mode === 'vfr' && setUserMapSettings({ navigraphData: { mode: 'ifrHigh' } })]"
                >
                    Automatic IFR level
                </common-toggle>
            </div>
            <common-notification
                cookie-name="ifr-tutorial"
                type="info"
            >
                Affects airways and holdings
            </common-notification>
            <common-radio-group
                :items="[{ value: 'ifrHigh', text: 'IFR High' }, { value: 'ifrLow', text: 'IFR Low' }]"
                :model-value="store.mapSettings.navigraphData?.mode ?? 'ifrHigh'"
                @update:modelValue="setUserMapSettings({ navigraphData: { mode: $event as any } })"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import type { Units } from 'ol/control/ScaleLine';
import type { MapLayoutLayer, MapLayoutLayerExternalOptions } from '~/types/map';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';
import MapFilterTransparency from '~/components/map/filters/MapFilterTransparency.vue';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import { useStore } from '~/store';
import { isProductionMode } from '~/utils/shared';
import CommonSigmetsSettings from '~/components/common/misc/CommonSigmetsSettings.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { sigmetDates } from '~/composables';

defineProps({});
const store = useStore();
const tab = ref('layers');

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

watch(() => store.mapSettings.navigraphData, () => {
    checkForNavigraph();
}, {
    deep: true,
});

const sigmetDatesList = sigmetDates();
</script>

<style scoped lang="scss">
.layers {

}
</style>
