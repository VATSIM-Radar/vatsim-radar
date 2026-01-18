<template>
    <form
        class="debug-controller __info-sections"
        @submit.prevent="$emit('submit')"
    >
        <ui-columns-display>
            <template #col1>
                <ui-input-text
                    :input-attrs="{ disabled: !controller.default }"
                    :model-value="controller.cid.toString()"
                    type="number"
                    @update:modelValue="controller.cid = isNaN(+$event!) ? Date.now() : +$event!"
                >
                    CID
                </ui-input-text>
            </template>
            <template #col2>
                <ui-input-text  v-model="controller.name">
                    Name
                </ui-input-text>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-input-text
                    ref="callsign"
                    v-model="controller.callsign"
                >
                    Callsign
                </ui-input-text>
            </template>
            <template #col2>
                <ui-input-text  v-model="controller.frequency">
                    Frequency
                </ui-input-text>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-select
                    v-model="controller.facility"
                    :items="atcPositions"
                    width="100%"
                >
                    <template #label>
                        Facility (optional)
                    </template>
                </ui-select>
            </template>
            <template #col2>
                <ui-select
                    v-model="controller.rating"
                    :items="atcRatings"
                    width="100%"
                >
                    <template #label>
                        Rating
                    </template>
                </ui-select>
            </template>
        </ui-columns-display>
        <div class="__section-group">
            <ui-input-text v-model="controller.text_atis![0]">
                ATIS Line 1
            </ui-input-text>
            <ui-input-text v-model="controller.text_atis![1]">
                ATIS Line 2
            </ui-input-text>
            <ui-input-text v-model="controller.text_atis![2]">
                ATIS Line 3
            </ui-input-text>
        </div>
        <input
            v-show="false"
            type="submit"
        >
    </form>
</template>

<script setup lang="ts">
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import type { VatsimControllerWithField } from '~/components/map/settings/filters/MapFiltersDebug.vue';

defineEmits({
    submit() {
        return true;
    },
});

const controller = defineModel({
    type: Object as PropType<VatsimControllerWithField>,
    required: true,
});

const callsign = useTemplateRef('callsign');

const atcPositions: SelectItem[] = Object.entries(useFacilitiesIds()).filter(([key]) => key !== 'OBS').map(([text, value]) => ({ value, text }));
const atcRatings: SelectItem[] = Object.entries(useRatingsIds()).map(([text, value]) => ({ value, text }));

watch(callsign, val => {
    if (!val) return;
    val.$el.querySelector('input')?.focus();
});
</script>
