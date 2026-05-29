<template>
    <div class="settings __info-sections">
        <ui-notification remember-message="SETTINGS_V2_TUTORIAL" type="info">
            Looking for settings? Visit new <nuxt-link class="__link" to="/settings">Settings</nuxt-link> page
        </ui-notification>
        <quick-settings-layers/>
    </div>
</template>

<script setup lang="ts">
import QuickSettingsLayers from '~/components/map/settings/quick-settings/QuickSettingsLayers.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
</script>

<style scoped lang="scss">
.settings {
    &, & .__info-sections {
        gap: 16px !important;
    }

    :deep(.title) {
        margin-bottom: 0;
    }

    &_edit {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_warning {
            font-size: 14px;
            color: $red400;
        }
    }
}
</style>
