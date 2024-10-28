<template>
    <common-page-block>
        <template #title>VatSIM Events</template>

        <common-event-card
            v-for="event in data?.events"
            :key="event.id"
            class="common-event"
            :event
        />
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import CommonEventCard from '~/components/common/vatsim/CommonEventCard.vue';

const { data } = await useAsyncData('events', async () => {
    return $fetch<{ events: VatsimEvent[]; divisions: VatsimDivision[]; subDivisions: VatsimSubDivision[] }>('/api/data/vatsim/events');
});

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});
</script>

<style scoped lang="scss">
.common-event {
  margin-bottom: 5px;
}
</style>
