<template>
    <form
        class="debug-controller __info-sections"
        @submit.prevent="$emit('submit')"
    >
        <ui-columns-display>
            <template #col1>
                <ui-input-text
                    :input-attrs="{ disabled: !booking.default }"
                    :model-value="booking.atc.cid.toString()"
                    type="number"
                    @update:modelValue="booking.atc.cid = isNaN(+$event!) ? Date.now() : +$event!"
                >
                    CID
                </ui-input-text>
            </template>
            <template #col2>
                <ui-input-text  v-model="booking.atc.name">
                    Name
                </ui-input-text>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-input-text
                    ref="callsign"
                    v-model="booking.atc.callsign"
                >
                    Callsign
                </ui-input-text>
            </template>
            <template #col2>
                <ui-select
                    v-model="booking.atc.facility"
                    :items="atcPositions"
                    width="100%"
                >
                    Facility (optional)
                </ui-select>
                <ui-select
                    v-model="booking.atc.rating"
                    :items="atcRatings"
                    width="100%"
                >
                    Rating
                </ui-select>
            </template>
        </ui-columns-display>
        <ui-notification type="info">
            time is in zulu
        </ui-notification>
        <ui-columns-display>
            <template #col1>
                <label>
                    from

                    <input
                        type="time"
                        :value="toUtcTimeString('start')"
                        @input="fromUtcTimeString(($event.target as HTMLInputElement).value as string, 'start')"
                    >
                </label>
            </template>
            <template #col2>
                <label>
                    to

                    <input
                        type="time"
                        :value="toUtcTimeString('end')"
                        @input="fromUtcTimeString(($event.target as HTMLInputElement).value as string, 'end')"
                    >
                </label>
            </template>
        </ui-columns-display>
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
import type {
    VatsimBookingWithField,
} from '~/components/map/settings/filters/MapFiltersDebug.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';

defineEmits({
    submit() {
        return true;
    },
});

const booking = defineModel({
    type: Object as PropType<VatsimBookingWithField>,
    required: true,
});

function toUtcTimeString(field: 'start' | 'end') {
    const date = new Date(booking.value[field]);

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${ hours }:${ minutes }`;
}

function fromUtcTimeString(timeStr: string, field: 'start' | 'end') {
    const [hours, minutes] = timeStr.split(':').map(Number);

    const date = new Date(Date.now());

    date.setUTCHours(hours);
    date.setUTCMinutes(minutes);
    date.setUTCSeconds(0);
    date.setUTCMilliseconds(0);

    booking.value[field] = date.getTime();
}

const callsign = useTemplateRef('callsign');

const atcPositions: SelectItem[] = Object.entries(useFacilitiesIds()).filter(([key]) => key !== 'OBS').map(([text, value]) => ({ value, text }));
const atcRatings: SelectItem[] = Object.entries(useRatingsIds()).map(([text, value]) => ({ value, text }));

watch(callsign, val => {
    if (!val) return;
    val.$el.querySelector('input')?.focus();
});
</script>
