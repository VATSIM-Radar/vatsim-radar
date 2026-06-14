<template>
    <ui-button
        :disabled="applyDisabled"
        size="S"
        type="secondary-black"
        @click="apply"
    >
        Apply recommended performance settings
    </ui-button>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';

const applyDisabled = computed(() => {
    return getKeyedValueFromSettings('map.traffic.declutter') === true &&
        getKeyedValueFromSettings('map.preferences.aircraft.showLimit') === 25 &&
        getKeyedValueFromSettings('map.preferences.aircraft.tracks.limit') === 25 &&
        getKeyedValueFromSettings('map.preferences.airports.showLimit') === 25 &&
        getKeyedValueFromSettings('map.preferences.airports.showMode') === 'staffedAndGroundTraffic' &&
        getKeyedValueFromSettings('map.layers.layer') === 'basic';
});

function apply() {
    setSettingByKey('map.traffic.declutter', true);
    setSettingByKey('map.preferences.aircraft.showLimit', 25);
    setSettingByKey('map.preferences.aircraft.tracks.limit', 25);
    setSettingByKey('map.preferences.airports.showMode', 'staffedAndGroundTraffic');
    setSettingByKey('map.preferences.airports.showLimit', 25);
    setSettingByKey('map.layers.layer', 'basic');
}
</script>


