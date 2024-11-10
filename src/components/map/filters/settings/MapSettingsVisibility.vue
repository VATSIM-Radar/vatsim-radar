<template>
    <div class="__info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{ hide: { title: 'ATC & Layers' }, modes: { title: 'Airports & Traffic' } }"
        />

        <template v-if="tab === 'modes'">
            <common-toggle
                :model-value="!!store.mapSettings.hideATISOnly"
                @update:modelValue="setUserMapSettings({ hideATISOnly: $event })"
            >
                Hide info when only ATIS

                <template #description>
                    Hides ATIS button when airport only has ATIS
                </template>
            </common-toggle>

            <common-block-title>
                Airports mode
            </common-block-title>

            <common-select
                :items="[
                    { text: 'All', value: 'all' },
                    { text: 'Staffed only', value: 'staffedOnly' },
                    { text: 'Staffed or has ground traffic', value: 'staffedAndGroundTraffic' },
                ]"
                :model-value="store.mapSettings.airportsMode ?? 'all'"
                @update:modelValue="setUserMapSettings({ airportsMode: $event as any })"
            />

            <common-block-title>
                Ground traffic
            </common-block-title>

            <common-select
                :items="[
                    { text: 'Hide all', value: 'always' },
                    { text: 'Hide if zoomed out', value: 'lowZoom' },
                    { text: 'Show all (default)', value: 'never' },
                ]"
                :model-value="store.mapSettings.groundTraffic?.hide ?? null"
                placeholder="Ground traffic mode"
                @update:modelValue="setUserMapSettings({ groundTraffic: { hide: $event as any } })"
            />

            <div class="__section-group">
                <common-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never' || !store.mapSettings.groundTraffic?.hide"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyLocation === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyLocation: $event } })"
                >
                    Apply to current

                    <template #description>
                        By default, we still show traffic for airport you're currently in
                    </template>
                </common-toggle>
                <common-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never' || !store.mapSettings.groundTraffic?.hide"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyArrival === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyArrival: $event } })"
                >
                    Apply to arrival

                    <template #description>
                        By default, we still show traffic for airport you're flying to
                    </template>
                </common-toggle>
            </div>
        </template>
        <template v-else>
            <common-block-title>
                ATC
            </common-block-title>

            <common-toggle
                :disabled="store.mapSettings.visibility?.atc === false"
                :model-value="!store.mapSettings.visibility?.atcLabels"
                @update:modelValue="setUserMapSettings({ visibility: { atcLabels: !$event } })"
            >
                Labels
            </common-toggle>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="store.mapSettings.visibility?.atc !== false"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: !$event ? false : {} } })"
                >
                    All
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('firs')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { firs: !$event } } })"
                >
                    FIRs
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('approach')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { approach: !$event } } })"
                >
                    Approach
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('ground')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { ground: !$event } } })"
                >
                    Locals
                </common-toggle>
            </div>

            <common-block-title>
                Objects
            </common-block-title>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="!store.mapSettings.visibility?.airports"
                    @update:modelValue="setUserMapSettings({ visibility: { airports: !$event } })"
                >
                    Airports
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.pilots"
                    @update:modelValue="setUserMapSettings({ visibility: { pilots: !$event } })"
                >
                    Aircraft
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.gates"
                    @update:modelValue="setUserMapSettings({ visibility: { gates: !$event } })"
                >
                    Gates
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.runways"
                    @update:modelValue="setUserMapSettings({ visibility: { runways: !$event } })"
                >
                    Runways
                </common-toggle>
            </div>

            <common-block-title>
                Personal Info
            </common-block-title>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="!store.mapSettings.visibility?.pilotsInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { pilotsInfo: !$event } })"
                >
                    Pilots
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.atcInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { atcInfo: !$event } })"
                >
                    Controllers
                </common-toggle>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { useStore } from '~/store';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';

const store = useStore();

const tab = ref('hide');
</script>
