<template>
    <div class="settings __info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{
                layers: {
                    title: 'Layers',
                    disabled: true,
                },
                visibility: {
                    title: 'Visibility',
                },
                colors: {
                    title: 'Colors',
                    disabled: true,
                },
            }"
        />

        <template v-if="tab === 'visibility'">
            <common-block-title>
                Hide ATC
            </common-block-title>

            <common-toggle
                :disabled="store.mapSettings.visibility?.atc === false"
                :model-value="!!store.mapSettings.visibility?.atcLabels"
                @update:modelValue="setUserMapSettings({ visibility: { atcLabels: $event } })"
            >
                Labels
            </common-toggle>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="store.mapSettings.visibility?.atc === false"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: $event ? false : {} } })"
                >
                    All
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="isHideAtcType('firs')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { firs: $event } } })"
                >
                    FIRs
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="isHideAtcType('approach')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { approach: $event } } })"
                >
                    Approach
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="isHideAtcType('ground')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { ground: $event } } })"
                >
                    Locals
                </common-toggle>
            </div>

            <common-block-title>
                Objects
            </common-block-title>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="!!store.mapSettings.visibility?.airports"
                    @update:modelValue="setUserMapSettings({ visibility: { airports: $event } })"
                >
                    Airports
                </common-toggle>

                <common-toggle
                    :model-value="!!store.mapSettings.visibility?.pilots"
                    @update:modelValue="setUserMapSettings({ visibility: { pilots: $event } })"
                >
                    Aircraft
                </common-toggle>

                <common-toggle
                    :model-value="!!store.mapSettings.visibility?.gates"
                    @update:modelValue="setUserMapSettings({ visibility: { gates: $event } })"
                >
                    Gates
                </common-toggle>

                <common-toggle
                    :model-value="!!store.mapSettings.visibility?.runways"
                    @update:modelValue="setUserMapSettings({ visibility: { runways: $event } })"
                >
                    Runways
                </common-toggle>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';

const tab = ref('visibility');
const store = useStore();
</script>

<style scoped lang="scss">

</style>
