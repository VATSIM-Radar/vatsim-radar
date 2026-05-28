<template>
    <popup-fullscreen
        v-model="mapStore.distance.tutorial"
        width="600px"
    >
        <template #title>
            Distance Tool
        </template>

        You have enabled Distance Tool.<br> This is a message to give you a little understanding
        on how it works.

        <ol class="__info-sections">
            <li>
                <strong>This is not a tool for supervising</strong>.
                <br>VATSIM Radar has delays.
                <br> Each airspace has it's own separation rules.
                <br> Please, do not .wallop for separation issues.<br> If you think that separation was bad - provide
                feedback via local ATC facility instead.
            </li>
            <li>
                To activate tool, press twice on the map
            </li>
            <li>
                To pin point to aircraft, double click on it
            </li>
            <li>
                This tool disables double click to zoom. Need to use both Distance Tool and click to zoom? Enable
                CTRL+Click!

                <ui-toggle
                    :model-value="distanceInteraction === 'ctrlclick'"
                    @update:modelValue="setUserLocalSettings({ distance: { ctrlClick: $event } })"
                >
                    CTRL+Click instead of double click
                </ui-toggle>
            </li>
            <li>
                You can change CTRL+Click action and displayed units in Map layer settings (second icon on left filters
                screen)
            </li>
        </ol>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';

const mapStore = useMapStore();
const distanceInteraction = useSettingValueFromFunc('map.layers.distance.interaction');
</script>
