<template>
    <div
        v-if="vatglassesActive && !store.mapSettings.vatglasses?.combined && (!hideIfDisabled || !disabledLevel)"
        class="__grid-info-sections"
    >
        <div class="__grid-info-sections_title">
            VATGlasses Level
        </div>
        <div class="__section-group">
            <input
                v-if="(!disabledLevel || showAuto) && store.isPC"
                v-model="vatglassesLevel"
                class="range"
                :class="{ 'range--wide': hideIfDisabled }"
                :disabled="disabledLevel && !showAuto"
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
                    disabled: disabledLevel && !showAuto,
                }"
                input-type="number"
            />
            <label v-if="store.user && dataStore.vatsim.data.keyedPilots.value[store.user!.cid.toString() ?? ''] && showAuto">
                <input
                    :checked="store.mapSettings.vatglasses?.autoLevel !== false"
                    type="checkbox"
                    @input="setUserMapSettings({ vatglasses: { autoLevel: !store.mapSettings.vatglasses?.autoLevel } })"
                >
                A
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { useStore } from '~/store';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';

defineProps({
    hideIfDisabled: {
        type: Boolean,
        default: false,
    },
    showAuto: {
        type: Boolean,
        default: false,
    },
});
const store = useStore();
const dataStore = useDataStore();

const vatglassesLevel = computed({
    get() {
        return store.localSettings.vatglassesLevel?.toString();
    },
    set(value) {
        if (value !== undefined) {
            setUserLocalSettings({ vatglassesLevel: Number(value) });
            setUserMapSettings({ vatglasses: { autoLevel: false } });
        }
    },
});

watch(() => store.mapSettings.vatglasses?.autoLevel, () => {
    const user = dataStore.vatsim.data.keyedPilots.value[+store.user!.cid.toString()];
    if (!user) return;

    setUserLocalSettings({
        vatglassesLevel: Math.round(user.altitude / 1000) * 10,
    });
});

const vatglassesActive = isVatGlassesActive;
const disabledLevel = computed(() => store.mapSettings.vatglasses?.autoLevel !== false && !!store.user && dataStore.vatsim.data.keyedPilots.value[store.user!.cid.toString() ?? '']);
</script>

<style lang="scss" scoped>
.range--wide {
    width: 80px;
}

label {
    display: flex;
    align-items: center;
}

.vatglassesLevel-input :deep(.input_container) {
    padding: 0 8px;
}
</style>
