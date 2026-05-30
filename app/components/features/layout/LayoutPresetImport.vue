<template>
    <popup-fullscreen :model-value="store.presetImport.preset === false">
        <template #title>Preset Import</template>
        Preset import failed. That could be because preset name length is more than 30 symbols, invalid JSON, or an
        error in yours or ours network.
        <template #actions>
            <ui-button @click="store.presetImport.preset = null">
                Thanks, I guess?
            </ui-button>
        </template>
    </popup-fullscreen>
    <popup-fullscreen
        :model-value="!!store.presetImport.preset && typeof store.presetImport.preset === 'object'"
        width="600px"
    >
        <template #title>Preset Import</template>

        Warning: preset import will overwrite your current preset.<br><br>

        <ui-input-text
            v-if="store.user"
            v-model="store.presetImport.name"
            placeholder="Enter a name for new preset"
        />

        <template #actions>
            <ui-button
                type="secondary"
                @click="store.presetImport.preset = null"
            >
                Cancel import
            </ui-button>
            <ui-button
                :disabled="!store.presetImport.name && !!store.user"
                @click="store.presetImport.save!()"
            >
                Import preset
            </ui-button>
        </template>
    </popup-fullscreen>
    <popup-fullscreen
        :model-value="!!store.presetImport.error"
        @update:modelValue="$event === false && (store.presetImport.error = $event)"
    >
        <template #title>
            A preset with this name already exists
        </template>

        You are trying to save preset with same name as you already have.<br> Do you maybe want to override it?

        <template #actions>
            <ui-button
                hover-color="red700"
                primary-color="red500"
                @click="typeof store.presetImport.error === 'function' && store.presetImport.error().then(() => store.presetImport.error = false)"
            >
                Overwrite my old preset
            </ui-button>
            <ui-button @click="store.presetImport.error = false">
                I'll rename it
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const store = useStore();
</script>
