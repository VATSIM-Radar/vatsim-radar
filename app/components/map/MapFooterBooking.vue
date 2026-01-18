<template>
    <div class="footer-time-popup__content">
        <ui-date-picker
            :model-value="bookingRange"
            :use-local="store.mapSettings.bookingsLocalTimezone"
        />
        <div class="footer-time-popup__arrows">
            <ui-button
                size="S"
                @click="shiftRange(-24, 'hour')"
            >
                - 24h
            </ui-button>
            <ui-button
                size="S"
                @click="shiftRange(-6, 'hour')"
            >
                - 6h
            </ui-button>
            <ui-button
                size="S"
                @click="shiftRange(-1, 'hour')"
            >
                - 1h
            </ui-button>
            <ui-button
                class="footer-time-popup__apply"
                :hover-color="bookingChanged ? 'warning400' : 'primary400'"
                :primary-color="bookingChanged ? 'warning500' : 'primary500'"
                size="M"
                type="primary"
                @click="applyBookingTimes"
            >
                Apply
            </ui-button>
            <ui-button
                size="S"
                @click="shiftRange(1, 'hour')"
            >
                + 1h
            </ui-button>
            <ui-button
                size="S"
                @click="shiftRange(6, 'hour')"
            >
                + 6h
            </ui-button>
            <ui-button
                size="S"
                @click="shiftRange(24, 'hour')"
            >
                + 24h
            </ui-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from '~/store';
// import PopupAside from '~/components/common/blocks/PopupAside.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiDatePicker from '~/components/ui/inputs/UiDatePicker.vue';

// const props = defineProps({
//     show: Boolean,
// });
// const showTimePopup = computed(() => props.show);


const store = useStore();
const route = useRoute();
const bookingRange = reactive({
    from: store.bookingsStartTime && !isNaN(Number(store.bookingsStartTime))
        ? new Date(Number(store.bookingsStartTime))
        : new Date(),
    to: store.bookingsEndTime && !isNaN(Number(store.bookingsEndTime))
        ? new Date(Number(store.bookingsEndTime))
        : new Date(),
});

onMounted(() => {
    // If URL has start/end, use those and do not change again
    if (route.query.start !== undefined && route.query.end !== undefined) {
        const start = Number(route.query.start);
        const end = Number(route.query.end);
        if (!isNaN(start) && !isNaN(end)) {
            store.bookingsStartTime = new Date(start);
            store.bookingsEndTime = new Date(end);
            bookingRange.from = new Date(start);
            bookingRange.to = new Date(end);
            store.bookingOverride = true;
            return;
        }
    }

    // Otherwise, set to now and now + bookingHours (or 30 min)
    const now = new Date();
    let addMs = 30 * 60 * 1000; // default 30 min
    if (store.mapSettings.bookingHours) {
        addMs = Number(store.mapSettings.bookingHours) * 60 * 60 * 1000;
        if (isNaN(addMs) || addMs <= 0) addMs = 30 * 60 * 1000;
    }
    store.bookingsStartTime = new Date(now);
    store.bookingsEndTime = new Date(now.getTime() + addMs);
    bookingRange.from = new Date(now);
    bookingRange.to = new Date(now.getTime() + addMs);
});

function applyBookingTimes() {
    if (bookingRange.from instanceof Date && !isNaN(bookingRange.from.getTime())) {
        store.bookingsStartTime = bookingRange.from;
    }
    if (bookingRange.to instanceof Date && !isNaN(bookingRange.to.getTime())) {
        store.bookingsEndTime = bookingRange.to;
    }
    startBookingOverride();
}

function startBookingOverride() {
    store.bookingOverride = true;
}

function shiftRange(hours: number, unit: 'hour') {
    const ms = hours * 60 * 60 * 1000;
    if (bookingRange.from instanceof Date && bookingRange.to instanceof Date) {
        bookingRange.from = new Date(bookingRange.from.getTime() + ms);
        bookingRange.to = new Date(bookingRange.to.getTime() + ms);
    }
}

// function setNextHour() {
//     const now = new Date();
//     now.setMinutes(0, 0, 0);
//     now.setHours(now.getHours() + 1);
//     bookingRange.from = new Date(now);
//     bookingRange.to = new Date(now.getTime() + (60 * 1000));
//     applyBookingTimes();
// }

const bookingChanged = computed(() => {
    if (!store.bookingOverride) return true;
    const storeStart = store.bookingsStartTime instanceof Date
        ? store.bookingsStartTime.getTime()
        : new Date(store.bookingsStartTime).getTime();
    const storeEnd = store.bookingsEndTime instanceof Date
        ? store.bookingsEndTime.getTime()
        : new Date(store.bookingsEndTime).getTime();
    return (
        bookingRange.from.getTime() !== storeStart ||
        bookingRange.to.getTime() !== storeEnd
    );
});
</script>

<style scoped lang="scss">
.footer-time-popup {
    &__arrows {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: center;

        margin: 12px 0;
    }

    &__arrows-spacer {
        flex: 1;
    }

    &__apply {
        margin: 0 8px;
    }
}
</style>
