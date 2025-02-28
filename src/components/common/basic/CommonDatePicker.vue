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

interface DateRange {
    from: Date;
    to?: Date;
}

const props = defineProps<{
    modelValue: DateRange;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: DateRange): void;
}>();

const formatDate = (date: Date): string => {
    return date.toISOString().slice(0, 16);
};

const formattedStartDate = computed(() => formatDate(props.modelValue.from));
const formattedEndDate = computed(() => props.modelValue.to ? formatDate(props.modelValue.to) : '');

const updateStartDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', { ...props.modelValue, from: new Date(target.value) });
};

const updateEndDate = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', { ...props.modelValue, to: new Date(target.value) });
};

const adjustTime = (isStart: boolean, minutes: number) => {
    const dateToAdjust = isStart ? props.modelValue.from : props.modelValue.to;
    if (dateToAdjust) {
        const newDate = new Date(dateToAdjust.getTime() + (minutes * 60000));
        emit('update:modelValue', {
            ...props.modelValue,
            [isStart ? 'from' : 'to']: newDate,
        });
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
