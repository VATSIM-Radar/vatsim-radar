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
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';

export interface DateRange {
    from: Date;
    to: Date;
}

const dateRange = defineModel<DateRange>({ required: true });

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${ year }-${ month }-${ day }T${ hours }:${ minutes }`;
};
const formattedStartDate = computed(() => formatDate(dateRange.value.from));
const formattedEndDate = computed(() => dateRange.value.to ? formatDate(dateRange.value.to) : '');

const updateStartDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    dateRange.value = { ...dateRange.value, from: new Date(target.value) };
};

const updateEndDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    dateRange.value = { ...dateRange.value, to: new Date(target.value) };
};

const adjustTime = (isStart: boolean, minutes: number) => {
    const dateToAdjust = isStart ? dateRange.value.from : dateRange.value.to;
    if (dateToAdjust) {
        const newDate = new Date(dateToAdjust.getTime() + (minutes * 60000));
        dateRange.value = {
            ...dateRange.value,
            [isStart ? 'from' : 'to']: newDate,
        };
    }
};
</script>

  <style scoped lang="scss">
    .time-picker {
        display: flex;
        flex-direction: row;
        gap: 5%;
        align-items: center;
        justify-content: center;

        width: 100%;

        &-container {
            display: flex;
            gap: 5px;
            align-items: center;
            justify-content: center;
        }

        &-between {
            font-size: 50px;
        }
    }
  </style>
