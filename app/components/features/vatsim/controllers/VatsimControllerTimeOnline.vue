<template>
    <ui-text
        class="atc-time"
        :class="{ 'atc-time--booking': controller.booking && showBooking }"
        type="caption"
    >
        <div
            v-if="controller.booking && showBooking"
            class="atc-time_section"
        >
            <div class="atc-time_text">
                Booked until:
            </div>
            <ui-chip class="atc-time_info">
                {{ makeBookingTime(controller.booking?.end, bookingsLocalTimezone) }}z
            </ui-chip>
        </div>
        <div class="atc-time_section">
            <div class="atc-time_text">
                Time online:
            </div>
            <ui-chip class="atc-time_info">
                {{ getATCTime(controller) }}
            </ui-chip>
        </div>
    </ui-text>
</template>

<script setup lang="ts">
import { getATCTime } from '~/composables/vatsim/controllers';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    controller: {
        type: Object as PropType<VatsimShortenedController>,
        required: true,
    },
    showBooking: {
        type: Boolean,
        default: false,
    },
});

const bookingsLocalTimezone = useSettingValueFromFunc('appearance.bookingsLocalTimezone');
</script>

<style scoped lang="scss">
.atc-time {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;

    width: 100%;

    color: $typographyPrimary;

    &_section {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    &--booking {
        justify-content: space-between;
    }
}
</style>
