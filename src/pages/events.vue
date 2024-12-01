<template>
    <common-page-block>
        <template #title>VATSIM Events (Beta)</template>

        <client-only>
            Timezone is set for {{ timezone.format(new Date()).slice(12, 100) }}.

            <template
                v-for="(events, day) in groupedEventData"
                :key="day"
            >
                <h2 class="common-event__title">{{ datetime.format(new Date(events![0].start_time)) }}</h2>

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

const { data } = await useAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
});

const datetime = new Intl.DateTimeFormat(['ru-RU', 'de-DE', 'en-GB', 'en-US'], {
    localeMatcher: 'best fit',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
});

const timezone = new Intl.DateTimeFormat(['de-DE'], {
    dateStyle: undefined,
    timeZoneName: 'shortOffset',
});

const groupedEventData = computed(() => {
    const events: Record<number, VatsimEvent[]> = {};

    data.value?.events.forEach(event => {
        const date = new Date(event.start_time);
        const key = parseInt(date.getFullYear().toString() + `0${ date.getMonth() }`.slice(-2) + `0${ date.getDate() }`.slice(-2));

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
</style>
