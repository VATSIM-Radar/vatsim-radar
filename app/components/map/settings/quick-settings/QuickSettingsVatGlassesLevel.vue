<template>
    <div
        v-if="(!vatglassesCombined || vatglassesCombineBands) && (!hideIfDisabled || !disabledLevel) && !store.bookingOverride"
        class="vg-level"
    >
        <div
            v-if="store.viewport.width > 1400 || store.viewport.width < 1350"
            class="vg-level_title __grid-info-sections_title"
        >
            <template v-if="showAuto">
                VAT<br> Glasses
            </template>
            <template v-else>
                Flight Level
            </template>
        </div>
        <div
            v-if="vatglassesActive"
            class="vg-level_content"
        >
            <ui-range
                class="range"
                :class="{ 'range--wide': hideIfDisabled }"
                :disabled="disabledLevel && !showAuto"
                hide-labels
                :max="430"
                :min="0"
                :model-value="vatglassesLevel ? +vatglassesLevel : 0"
                show-input
                :step="5"
                @update:modelValue="vatglassesLevel = $event.toString()"
            />
            <label v-if="store.user && ownFlight && showAuto">
                <input
                    :checked="vatglassesAutoLevel !== false"
                    type="checkbox"
                    @input="setSettingByKey('map.vatglasses.autoLevel', !vatglassesAutoLevel)"
                >
                A
            </label>
        </div>
        <ui-toggle
            v-if="showAuto && !vatglassesActiveSetting && store.user && ownFlight"
            :model-value="vatglassesAutoEnable !== false"
            @update:modelValue="setSettingByKey('map.vatglasses.autoEnable', $event)"
        />
        <ui-toggle
            v-else-if="showAuto"
            :model-value="!!vatglassesActiveSetting"
            @update:modelValue="setSettingByKey('map.vatglasses.active', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import { ownFlight } from '~/composables/vatsim/pilots';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiRange from '~/components/ui/inputs/UiRange.vue';

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
const vatglassesCombined = useSettingValueFromFunc('map.vatglasses.combined');
const vatglassesCombineBands = useSettingValueFromFunc('map.vatglasses.combineBands');
const vatglassesAutoLevel = useSettingValueFromFunc('map.vatglasses.autoLevel');
const vatglassesAutoEnable = useSettingValueFromFunc('map.vatglasses.autoEnable');
const vatglassesActiveSetting = useSettingValueFromFunc('map.vatglasses.active');

const vatglassesLevel = computed({
    get() {
        return store.localSettings.vatglassesLevel?.toString();
    },
    set(value) {
        if (value !== undefined) {
            setUserLocalSettings({ vatglassesLevel: Number(value) });
            if (vatglassesAutoLevel.value) {
                setSettingByKey('map.vatglasses.autoLevel', false);
            }
        }
    },
});

watch(vatglassesAutoLevel, () => {
    if (!store.user) return;
    const user = ownFlight.value;
    if (!user) return;

    const altitude = getPilotTrueAltitude(user);
    if (!Number.isFinite(altitude)) return;

    setUserLocalSettings({
        vatglassesLevel: Math.round(altitude / 500) * 5,
    });
});

const vatglassesActive = isVatGlassesActive;
const disabledLevel = computed(() => vatglassesAutoLevel.value !== false && !!store.user && !!ownFlight.value);
</script>

<style lang="scss" scoped>
.vg-level {
    display: flex;
    gap: 8px;
    align-items: center;

    &_title {
        white-space: nowrap;
    }

    &_content {
        display: flex;
        gap: 4px;
        align-items: center;
    }
}

.range {
    width: 140px;
}

label {
    display: flex;
    align-items: center;
}

.vatglassesLevel-input{
    width: 50px;
}
</style>
