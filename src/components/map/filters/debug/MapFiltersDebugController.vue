<template>
    <form
        class="debug-controller __info-sections"
        @submit.prevent="$emit('submit')"
    >
        <map-filter-columns>
            <template #col1>
                <common-input-text
                    :input-attrs="{ disabled: !controller.default }"
                    :model-value="controller.cid.toString()"
                    type="number"
                    @update:modelValue="controller.cid = isNaN(+$event!) ? Date.now() : +$event!"
                >
                    CID
                </common-input-text>
            </template>
            <template #col2>
                <common-input-text  v-model="controller.name">
                    Name
                </common-input-text>
            </template>
        </map-filter-columns>
        <map-filter-columns>
            <template #col1>
                <common-input-text
                    ref="callsign"
                    v-model="controller.callsign"
                >
                    Callsign
                </common-input-text>
            </template>
            <template #col2>
                <common-input-text  v-model="controller.frequency">
                    Frequency
                </common-input-text>
            </template>
        </map-filter-columns>
        <map-filter-columns>
            <template #col1>
                <common-select
                    v-model="controller.facility"
                    :items="atcPositions"
                    width="100%"
                >
                    <template #label>
                        Facility (optional)
                    </template>
                </common-select>
            </template>
            <template #col2>
                <common-select
                    v-model="controller.rating"
                    :items="atcRatings"
                    width="100%"
                >
                    <template #label>
                        Rating
                    </template>
                </common-select>
            </template>
        </map-filter-columns>
        <div class="__section-group">
            <common-input-text v-model="controller.text_atis![0]">
                ATIS Line 1
            </common-input-text>
            <common-input-text v-model="controller.text_atis![1]">
                ATIS Line 2
            </common-input-text>
            <common-input-text v-model="controller.text_atis![2]">
                ATIS Line 3
            </common-input-text>
        </div>
        <input
            v-show="false"
            type="submit"
        >
    </form>
</template>

<script setup lang="ts">
import MapFilterColumns from '~/components/map/filters/filters/MapFilterColumns.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import type { VatsimControllerWithField } from '~/components/map/filters/debug/MapFiltersDebug.vue';

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
