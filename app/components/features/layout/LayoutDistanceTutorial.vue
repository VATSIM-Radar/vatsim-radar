<template>
    <popup-fullscreen
        :model-value="mapStore.distance.tutorial || !notification"
        width="600px"
        @update:modelValue="$event ? undefined : [save(), mapStore.distance.tutorial = false]"
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

                <ui-setting-item :item="settingsItems.layers.distanceInteraction"/>
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
import { getSettingsItems } from '~/composables/settings/v2/sections';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';
import { checkNotification, saveUserNotification } from '~/composables/user';

const mapStore = useMapStore();
const settingsItems = getSettingsItems().value;
const notification = computed(() => checkNotification('DISTANCE_TUTORIAL'));
const save = () => saveUserNotification('DISTANCE_TUTORIAL');
</script>
