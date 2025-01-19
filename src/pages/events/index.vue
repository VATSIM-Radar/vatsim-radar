<template>
    <common-page-block>
        <template #title>VATSIM Events</template>

        <client-only>
            <common-toggle
                v-if="offset"
                :model-value="!!store.localSettings.eventsLocalTimezone"
                @update:modelValue="setUserLocalSettings({ eventsLocalTimezone: $event })"
            >
                Use Zulu time instead of  {{ timezone.format(new Date()).slice(4, 100) }}
            </common-toggle>

            <template
                v-for="(events, day) in groupedEventData"
                :key="day+String(store.localSettings.eventsLocalTimezone)"
            >
                <h2 class="common-event__title">{{ getDate(events![0].start_time) }}</h2>

                <common-event-card
                    v-for="event in events"
                    :key="event.id"
                    class="common-event"
                    :event
                />
            </template>
        </client-only>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import CommonEventCard from '~/components/common/vatsim/CommonEventCard.vue';
import type { VatsimEventData } from '~/server/api/data/vatsim/events';
import type { VatsimEvent } from '~/types/data/vatsim';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';

const { data } = await useAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
});

const store = useStore();

const timeZone = store.localSettings.eventsLocalTimezone ? 'UTC' : undefined;
const offset = new Date().getTimezoneOffset();

const datetime = new Intl.DateTimeFormat(['ru-RU', 'de-DE', 'en-GB', 'en-US'], {
    localeMatcher: 'best fit',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone,
});

const weekday = new Intl.DateTimeFormat(['en-US'], {
    weekday: 'long',
    timeZone,
});

function getDate(_date: string) {
    const date = new Date(_date);

    return `${ weekday.format(date) }, ${ datetime.format(date) }`;
}

const timezone = new Intl.DateTimeFormat(['de-DE'], {
    day: '2-digit',
    timeZoneName: 'shortOffset',
    timeZone,
});

const groupedEventData = computed(() => {
    const events: Record<number, VatsimEvent[]> = {};

    data.value?.events.forEach(event => {
        if (new Date(event.end_time) < new Date()) return;
        const date = new Date(event.start_time);
        const key = store.localSettings.eventsLocalTimezone
            ? parseInt(date.getUTCFullYear().toString() + `0${ date.getUTCMonth() }`.slice(-2) + `0${ date.getUTCDate() }`.slice(-2))
            : parseInt(date.getFullYear().toString() + `0${ date.getMonth() }`.slice(-2) + `0${ date.getDate() }`.slice(-2));

        events[key] ??= [];
        events[key].push(event);
    });

    return events;
});

useHead({
    title: 'Events',
});
</script>

<style scoped lang="scss">
.common-event {
    margin-bottom: 5px;

    &__title {
        margin-bottom: 16px;
        padding-top: 8px;

        font-size: 20px;
        font-weight: 500;
        color: $primary500;
    }

    :deep(a) {
        color: $primary500;
        @include hover {
            transition: 0.3s;

            &:hover {
                color: $primary300;
            }
        }
    }
}

.events_timezone {
    display: inline-block;

    &:empty {
        display: none;
    }
}
</style>
