<template>
    <div class="settings __info-sections">
        <div
            v-if="!store.mapPresets?.length"
            class="settings_edit_warning"
        >
            Settings are <strong>not</strong> automatically saved to database.
        </div>

        <common-tabs
            v-model="tab"
            class="settings_tabs"
            mobile-vertical
            :tabs="{
                layers: {
                    title: 'General',
                },
                visibility: {
                    title: 'Visibility',
                },
                colors: {
                    title: 'Colors',
                },
                management: {
                    title: 'Manage',
                },
            }"
        />

        <map-settings-layers v-if="tab === 'layers'"/>
        <map-settings-visibility v-else-if="tab === 'visibility'"/>
        <map-settings-colors v-else-if="tab === 'colors'"/>
        <map-settings-presets
            v-else-if="store.mapPresets && tab === 'management'"
            :refresh-presets="refresh"
        />
        <common-popup :model-value="importedPreset === false">
            <template #title>Preset Import</template>
            Preset import failed. That could be because preset name length is more than 30 symbols, invalid JSON, or an error in yours or ours network.
            <template #actions>
                <common-button @click="importedPreset = null">
                    Thanks, I guess?
                </common-button>
            </template>
        </common-popup>
        <common-popup
            :model-value="!!importedPreset && typeof importedPreset === 'object'"
            width="600px"
        >
            <template #title>Preset Import</template>

            Warning: preset import will overwrite your current settings.<br><br>

            <common-input-text
                v-model="importedPresetName"
                placeholder="Enter a name for new preset"
            />

            <template #actions>
                <common-button
                    type="secondary-875"
                    @click="importedPreset = null"
                >
                    Cancel import
                </common-button>
                <common-button
                    :disabled="!importedPresetName"
                    @click="createPreset"
                >
                    Import preset
                </common-button>
            </template>
        </common-popup>
        <common-popup
            :model-value="!!store.mapPresetsSaveFail"
            @update:modelValue="$event === false && (store.mapPresetsSaveFail = $event)"
        >
            <template #title>
                A preset with this name already exists
            </template>

            You are trying to save preset with same name as you already have.<br> Do you maybe want to override it?

            <template #actions>
                <common-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="typeof store.mapPresetsSaveFail === 'function' && store.mapPresetsSaveFail().then(() => store.mapPresetsSaveFail = false)"
                >
                    Overwrite my old preset
                </common-button>
                <common-button @click="store.mapPresetsSaveFail = false">
                    I'll rename it
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import MapSettingsVisibility from '~/components/map/filters/settings/MapSettingsVisibility.vue';
import MapSettingsLayers from '~/components/map/filters/settings/MapSettingsLayers.vue';
import MapSettingsColors from '~/components/map/filters/settings/MapSettingsColors.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { IUserMapSettings, UserMapPreset, UserMapSettings } from '~/utils/backend/map-settings';
import MapSettingsPresets from '~/components/map/filters/settings/MapSettingsPresets.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { useStore } from '~/store';
import { saveMapSettings } from '~/composables/settings';
import { sendUserMapSettings } from '~/composables';

const importedPreset = defineModel('importedPreset', {
    type: [Object, Boolean] as PropType<UserMapSettings | false | null>,
    default: null,
});

const importedPresetName = defineModel('importedPresetName', {
    type: String,
    required: true,
});

const store = useStore();

const tab = ref('layers');
const { refresh } = await useLazyAsyncData(async () => {
    store.mapPresets = await $fetch<UserMapPreset[]>('/api/user/settings/map');

    return true;
});

const createPreset = async () => {
    await saveMapSettings(await sendUserMapSettings(importedPresetName.value, importedPreset.value as IUserMapSettings, createPreset));
    importedPreset.value = null;
    refresh();
};
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
            color: $error400;
        }
    }

    &_tabs {
        position: sticky;
        z-index: 10;
        top: 48px - 16px;

        margin-bottom: -16px;
        padding-bottom: 16px;

        background: $darkgray1000;
    }
}
</style>
