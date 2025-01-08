<template>
    <div
        v-if="vatglassesActive && !store.mapSettings.vatglasses?.combined && (!hideIfDisabled || !disabledLevel)"
        class="__grid-info-sections __grid-info-sections--large-title"
    >
        <div class="__grid-info-sections_title">
            VATGlasses Level
        </div>
        <div class="__section-group">
            <input
                v-if="!disabledLevel && store.isPC"
                v-model="vatglassesLevel"
                max="430"
                min="0"
                step="10"
                type="range"
            >
            <common-input-text
                v-model="vatglassesLevel"
                class="vatglassesLevel-input"
                height="32px"
                :input-attrs="{
                    max: 430,
                    min: 0,
                    step: 10,
                    disabled: disabledLevel,
                }"
                input-type="number"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';

defineProps({
    hideIfDisabled: {
        type: Boolean,
        default: false,
    },
});
const store = useStore();
const mapStore = useMapStore();

const vatglassesLevel = computed({
    get() {
        return store.localSettings.vatglassesLevel?.toString();
    },
    set(value) {
        if (value !== undefined) {
            setUserLocalSettings({ vatglassesLevel: Number(value) });
        }
    },
});

const vatglassesActive = isVatGlassesActive();
const disabledLevel = computed(() => store.mapSettings.vatglasses?.autoLevel !== false && mapStore.overlays.some(x => x.key === store.user?.cid));
</script>
