<template>
    <div class="colors __info-sections">
        <div class="__grid-info-sections __grid-info-sections--large-title __grid-info-sections--reversed">
            <div class="__grid-info-sections_title">
                Settings apply to current theme only.
            </div>
            <common-button
                size="S"
                type="secondary-875"
            >
                Sync themes
            </common-button>
        </div>
        <common-color
            :model-value="store.mapSettings.colors?.[themeKey]?.approach"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approach: $event } } })"
        >
            Approach tracon/circle
        </common-color>
    </div>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import { useStore } from '~/store';

const store = useStore();

const themeKey = computed(() => store.getCurrentTheme);
</script>

<style scoped lang="scss">

</style>
