<template>
    <div class="distance-tutorial">
        <ui-button type="link" @click="mapStore.distance.tutorial = true">
            Tutorial
        </ui-button>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';

const mapStore = useMapStore();
</script>


