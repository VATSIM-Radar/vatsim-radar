<template>
    <div
        v-for="(rate, index) in arrivalRate"
        :key="index"
        class="rate"
    >
        <component
            :is="clockIcons[`clock${ index }` as keyof typeof clockIcons]"
            :class="getIconClassNames(index, useOpacity)"
            :style="{ '--icon-color': iconColor }"
        />
        <div
            :class="getTextClassNames(index, useOpacity)"
            :style="{ '--text-color': textColor }"
        >
            {{ rate.length }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { getArrivalRate } from '~/composables/airport';
import Clock0Icon from '~/assets/icons/airport/clock_0to15.svg?component';
import Clock1Icon from '~/assets/icons/airport/clock_15to30.svg?component';
import Clock2Icon from '~/assets/icons/airport/clock_30to45.svg?component';
import Clock3Icon from '~/assets/icons/airport/clock_45to0.svg?component';

const props = defineProps({
    aircraft: {
        type: Object as PropType<AirportPopupPilotList | null>,
        default: null,
    },
    textColor: {
        type: String,
        required: false,
        default: '#000000',
    },
    iconColor: {
        type: String,
        required: false,
        default: '#000000',
    },
    useOpacity: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const { aircraft } = toRefs(props);

const arrivalRate = getArrivalRate(aircraft, 4, 15);

const clockIcons = {
    clock0: Clock0Icon,
    clock1: Clock1Icon,
    clock2: Clock2Icon,
    clock3: Clock3Icon,
};


function getIconClassNames(index: number, useOpacity: boolean) {
    return [
        `rate_icon rate_icon--${ index }`,
        { [`rate_opacity--${ index }`]: useOpacity },
    ];
}

function getTextClassNames(index: number, useOpacity: boolean) {
    return [
        `rate_text rate--color${ index }`,
        { [`rate_opacity--${ index }`]: useOpacity },
    ];
}
</script>

<style scoped lang="scss">
.rate {
    display: flex;
    gap: 6px;
    align-items: center;

    &_opacity{
        &--1 {
            opacity: 0.8;
        }

        &--2 {
            opacity: 0.7;
        }

        &--3 {
            opacity: 0.6;
        }
    }

    &_icon {
        width: 12px;
        color: var(--icon-color);
    }

    &_text{
        color: var(--text-color);
    }
}
</style>
