<template>
    <div class="time-picker">
        <div class="time-picker-container">
            <common-button
                type="secondary-flat"
                @click="adjustTime(true, -30)"
            >
                -
            </common-button>
            <common-input-text
                input-type="datetime-local"
                :model-value="formattedStartDate"
                @input="updateStartDate"
            />
            <common-button
                type="secondary-flat"
                @click="adjustTime(true, 30)"
            >
                +
            </common-button>
        </div>
        <div
            v-if="modelValue.to"
            class="time-picker-between"
        >-</div>
        <div
            v-if="modelValue.to"
            class="time-picker-container"
        >
            <common-button
                type="secondary-flat"
                @click="adjustTime(false, -30)"
            >
                -
            </common-button>
            <common-input-text
                input-type="datetime-local"
                :model-value="formattedEndDate"
                @input="updateEndDate"
            />
            <common-button
                type="secondary-flat"
                @click="adjustTime(false, 30)"
            >
                +
            </common-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';

export interface DateRange {
    from: Date;
    to: Date;
}

const props = defineProps({
    useLocal: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    change() {
        return true;
    },
});

const dateRange = defineModel<DateRange>({ required: true });

const isLocal = computed(() => props.useLocal);

const formatDate = (date: Date): string => {
    if (isLocal.value) {
        // Local time
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${ year }-${ month }-${ day }T${ hours }:${ minutes }`;
    }
    else {
        // Zulu/UTC time
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${ year }-${ month }-${ day }T${ hours }:${ minutes }`;
    }
};

const formattedStartDate = computed(() => formatDate(dateRange.value.from));
const formattedEndDate = computed(() => dateRange.value.to ? formatDate(dateRange.value.to) : '');

const parseDateInput = (value: string): Date => {
    if (isLocal.value) {
        // Local time
        return new Date(value);
    }
    else {
        // Parse as UTC
        // value is in 'YYYY-MM-DDTHH:mm' format, treat as UTC
        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hour, minute));
    }
};

const updateStartDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    dateRange.value.from = parseDateInput(target.value);
    emit('change');
};

const updateEndDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    dateRange.value.to = parseDateInput(target.value);
    emit('change');
};

const adjustTime = (isStart: boolean, minutes: number) => {
    const dateToAdjust = isStart ? dateRange.value.from : dateRange.value.to;
    if (dateToAdjust) {
        const newDate = new Date(dateToAdjust.getTime() + (minutes * 60000));
        if (isStart) {
            dateRange.value.from = newDate;
        }
        else {
            dateRange.value.to = newDate;
        }
    }
    emit('change');
};
</script>

  <style scoped lang="scss">
    .time-picker {
        display: flex;
        flex-direction: row;
        gap: 16px;
        align-items: center;

        &-container {
            display: flex;
            gap: 5px;
            align-items: center;
        }

        &-between {
            font-size: 24px;
            line-height: 1;
        }
    }
  </style>
