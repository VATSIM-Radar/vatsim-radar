<template>
    <div
        v-if="vatglassesActive && !store.mapSettings.vatglasses?.combined && (!hideIfDisabled || !disabledLevel) && !store.bookingOverride"
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
                step="5"
                type="range"
                @wheel.prevent="handleWheel"
            >
            <common-input-text
                v-model="vatglassesLevel"
                class="vatglassesLevel-input"
                height="32px"
                :input-attrs="{
                    max: 430,
                    min: 0,
                    step: 5,
                    disabled: disabledLevel && !showAuto,
                }"
                input-type="number"
            />
            <label v-if="store.user && ownFlight && showAuto">
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
import { useStore } from '~/store';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import { ownFlight } from '~/composables/pilots';
import { isVatGlassesActive } from '~/utils/data/vatglasses';

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

let lastScrollTime = 0;

function handleWheel(e: WheelEvent) {
    const now = Date.now();
    const timeDiff = now - lastScrollTime;
    lastScrollTime = now;

    let stepMultiplier = 1;
    if (timeDiff < 80) stepMultiplier = 5;

    const delta = e.deltaY > 0 ? -1 : 1;
    const change = delta * 5 * stepMultiplier;

    const newValue = Math.min(430, Math.max(0, +(vatglassesLevel.value ?? '0') + change));
    vatglassesLevel.value = newValue.toString();
}

watch(() => store.mapSettings.vatglasses?.autoLevel, () => {
    if (!store.user) return;
    const user = ownFlight.value;
    if (!user) return;

    setUserLocalSettings({
        vatglassesLevel: Math.round(getPilotTrueAltitude(user) / 500) * 5,
    });
});

const vatglassesActive = isVatGlassesActive;
const disabledLevel = computed(() => store.mapSettings.vatglasses?.autoLevel !== false && !!store.user && !!ownFlight.value);
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
