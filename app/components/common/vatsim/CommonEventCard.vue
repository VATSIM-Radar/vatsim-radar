<template>
    <div>
        <div
            class="event-card"
            :class="{ 'event-card_active': active }"
            @click="details = !details"
        >
            <div class="event-card_start">
                <client-only>
                    {{ formattedStart }} - {{ formattedEnd }}<template v-if="store.localSettings.eventsLocalTimezone">z</template>
                </client-only>
            </div>
            <div class="event-card_name">
                {{ props.event.name }} <span
                    v-if="active"
                    class="event-card_name_active"
                >Now active!</span>
            </div>
            <div class="event-card_airports">
                {{ props.event.airports.map((a) => a.icao).join(", ") }}
            </div>
        </div>
        <div
            v-if="details"
            class="event-card_details"
        >
            <common-event-details :event/>
            <common-button
                class="event-card_details_btn"
                size="S"
                :to="`/events/${ event.id }`"
                type="secondary-875"
            >
                Open in a separate page
            </common-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { VatsimEvent } from '~/types/data/vatsim';
import CommonEventDetails from '~/components/common/vatsim/CommonEventDetails.vue';
import CommonButton from '~/components/ui/buttons/CommonButton.vue';
import { useStore } from '~/store';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const details = ref(false);
const store = useStore();
const timeZone = store.localSettings.eventsLocalTimezone ? 'UTC' : undefined;

const formatter = computed(() => new Intl.DateTimeFormat(['en-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
}));

const formatterWithDate = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
}));

const formattedStart = computed(() => formatter.value.format(new Date(props.event.start_time)));
const formattedEnd = computed(() => {
    const date = new Date(props.event.end_time);

    const method = store.localSettings.eventsLocalTimezone ? 'getUTCDate' : 'getDate';

    if (date[method]() !== new Date(props.event.start_time)[method]()) return formatterWithDate.value.format(date);

    return formatter.value.format(date);
});
const active = computed(() => new Date(props.event.start_time) < new Date());
</script>

<style scoped lang="scss">
.event-card {
    cursor: pointer;

    display: grid;
    grid-template-columns: 200px 600px auto 50px;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;

    min-height: 52px;
    padding: 8px;
    border-radius: 4px;

    font-size: 14px;

    background: $darkgray900;

    transition: 0.3s;

    @include mobile {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    @include hover {
        &:hover {
            background: $darkgray875;
        }
    }

    &_start {
        text-transform: uppercase;
    }

    &_name {
        font-size: 14px;
        font-weight: 600;
    }

    &_active {
        border: 2px solid $info300;
    }

    &_name_active {
        color: $info300;
    }

    &_details {
        display: flex;
        flex-direction: column;

        margin: 0 20px;
        padding: 0 0 8px 8px;
        border: 2px solid $darkgray800;
        border-top: 0;
        border-radius: 4px;

        background: $darkgray900;

        &_btn {
            align-self: flex-start;
        }
    }
}
</style>
