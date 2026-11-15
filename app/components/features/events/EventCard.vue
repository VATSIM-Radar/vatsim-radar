<template>
    <ui-text
        class="event-card"
        :class="{
            'event-card--active': active,
            'event-card--details': details,
            '__events-cpt': event.type === VatsimEventType.Exam,
            '__events-single': event.organisers.length <= 1 && event.type !== VatsimEventType.Exam,
            '__events-multiple': event.organisers.length > 1 && event.type !== VatsimEventType.Exam,
        }"
        type="2b"
        @click="details = !details"
    >
        <div class="event-card_head">
            <div
                class="event-card_start"
            >
                <client-only>
                    {{ formattedStart }} - {{ formattedEnd }}<template v-if="!eventsTimezone">z</template>
                </client-only>
            </div>
            <div class="event-card_name">
                {{ props.event.name }}
            </div>
            <div class="event-card_airports">
                <a
                    v-for="airport in event.airports"
                    :key="airport.icao"
                    class="event-card_airports_airport __link"
                    :href="`/?airport=${ airport.icao }`"
                    target="_blank"
                >
                    {{airport.icao}}
                </a>
            </div>
        </div>
        <div
            v-if="details"
            class="event-card_details"
            @click.stop
        >
            <event-details :event/>
            <ui-button
                class="event-card_details_btn"
                size="S"
                :to="`/events/${ event.id }`"
                type="secondary"
            >
                <template v-if="isPast">
                    Event stats & heatmap
                </template>
                <template v-else>
                    Open event in a new tab
                </template>
            </ui-button>
        </div>
    </ui-text>
</template>

<script setup lang="ts">
import { VatsimEventType } from '~/types/data/vatsim';
import type { VatsimEvent } from '~/types/data/vatsim';
import EventDetails from '~/components/features/events/EventDetails.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const details = ref(false);
const route = useRoute();

const isPast = computed(() => route.path.endsWith('/past'));

const eventsTimezone = useSettingValueFromFunc('appearance.dataLocalTimezone');
const timeFormat = useSettingValueFromFunc('appearance.timeFormat');

const timeZone = computed(() => !eventsTimezone.value ? 'UTC' : undefined);

const formatter = computed(() => new Intl.DateTimeFormat(['en-DE'], {
    hourCycle: timeFormat.value === '12h' ? 'h12' : 'h23',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone.value,
}));

const formatterWithDate = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: timeFormat.value === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone.value,
}));

const formattedStart = computed(() => formatter.value.format(new Date(props.event.start_time)));
const formattedEnd = computed(() => {
    const date = new Date(props.event.end_time);

    const method = !eventsTimezone.value ? 'getUTCDate' : 'getDate';

    if (date[method]() !== new Date(props.event.start_time)[method]()) return formatterWithDate.value.format(date);

    return formatter.value.format(date);
});
const active = computed(() => new Date(props.event.start_time) < new Date() && new Date(props.event.end_time) > new Date());
</script>

<style scoped lang="scss">
.event-card {
    position: relative;

    padding: 4px 16px;
    border-radius: 4px;

    background: $darkGray700;

    transition: 0.3s;

    &::before {
        content: '';

        position: absolute;
        top: 4px;
        left: 4px;

        display: block;
        align-self: stretch;

        width: 2px;
        height: calc(100% - 8px);
        border-radius: 2px;

        background: var(--color);
    }

    @include hover {
        &:hover {
            background: $darkGray600;
        }
    }

    &_head {
        cursor: pointer;

        display: grid;
        grid-template-columns: 200px 2fr 1fr;
        gap: 8px;
        align-items: center;
        justify-content: flex-start;

        min-height: 50px;

        @include mobile {
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            align-items: flex-start;
        }
    }

    &_start {
        display: flex;
        gap: 12px;
        align-items: center;
        align-self: stretch;

        text-transform: uppercase;
    }

    &--active {
        border: 1px solid $brandPrimary;
    }

    &--details {
        background: $darkGray700 !important;
    }

    &_airports {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        &_airport {
            color: currentColor;
        }
    }

    &_details {
        display: flex;
        flex-direction: column;

        margin-top: 4px;
        border-top: 1px solid $strokeDefault;

        background: $darkGray700;

        &_btn {
            align-self: flex-start;
        }
    }
}
</style>
