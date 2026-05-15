<template>
    <popup-fullscreen
        v-if="store.updateRequired || $pwa?.needRefresh"
        v-model="updateRequired"
        disabled
    >
        <template #title>Page Reload Needed</template>

        A new VATSIM Radar update is available! Please reload the page to apply the update.

        <template #actions>
            <ui-button @click="reload">
                Apply and reload
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import { useStore } from '~/store';

const updateRequired = ref(true);
const { $pwa } = useNuxtApp();
const store = useStore();

const reload = () => {
    if ($pwa?.needRefresh) {
        $pwa.updateServiceWorker();
    }
    else {
        location.reload();
    }
};
</script>
