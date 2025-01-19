<template>
    <common-page-block v-if="data">
        <template #title>
            {{ data.name }}
        </template>
        <common-event-details :event="data"/>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { VatsimEvent } from '~/types/data/vatsim';
import CommonEventDetails from '~/components/common/vatsim/CommonEventDetails.vue';

const route = useRoute();

const { data } = await useAsyncData(`event-${ route.params.id }`, async () => {
    return $fetch<VatsimEvent>(`/api/data/vatsim/events/${ route.params.id }`).catch(e => {
        showError(e);
        return null;
    });
});
</script>
