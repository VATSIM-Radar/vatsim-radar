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
import CommonEventCard from '~/components/common/vatsim/CommonEventCard.vue';
import type { VatsimEventData } from '~/server/api/data/vatsim/events';

const { data } = await useAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
});
</script>

<style scoped lang="scss">
.common-event {
  margin-bottom: 5px;
}
</style>
