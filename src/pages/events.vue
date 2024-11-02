<template>
    <common-page-block>
        <template #title>VATSIM Events (Alpha)</template>

        <template
            v-for="(events, day) in groupedEventData"
            :key="day"
        >
            <h2 class="common-event__title">{{ new Date(day).toLocaleDateString() }}</h2>

            <common-event-card
                v-for="event in events"
                :key="event.id"
                class="common-event"
                :event
            />
        </template>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import CommonEventCard from '~/components/common/vatsim/CommonEventCard.vue';
import type { VatsimEventData } from '~/server/api/data/vatsim/events';

const { data } = await useAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
});

const groupedEventData = computed(() => {
    return Object.groupBy(data.value?.events || [], event => event.start_time.substring(0, 10));
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
}
</style>
