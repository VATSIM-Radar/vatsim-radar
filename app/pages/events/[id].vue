<template>
    <ui-page-container v-if="data">
        <template #title>
            {{ data.name }}
        </template>
        <event-details :event="data"/>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import type { VatsimEvent } from '~/types/data/vatsim';
import EventDetails from '~/components/features/events/EventDetails.vue';

const route = useRoute();

const { data } = await useAsyncData(`event-${ route.params.id }`, async () => {
    return $fetch<VatsimEvent>(`/api/data/vatsim/events/${ route.params.id }`).catch(e => {
        showError(e);
        return null;
    });
});

useHead(() => {
    const event = data.value;

    if (!event) {
        return {
            title: 'Event',
        };
    }

    return {
        title: event.name,
        titleTemplate(title) {
            return title!;
        },
        meta: [
            {
                name: 'og:title',
                content: event.name,
            },
            {
                name: 'twitter:title',
                content: event.name,
            },
            {
                name: 'twitter:card',
                content: 'summary_large_image',
            },
            {
                name: 'og:type',
                content: 'article',
            },
            {
                name: 'og:image',
                content: event.banner,
            },
            {
                name: 'twitter:image',
                content: event.banner,
            },
            {
                name: 'og:locale',
                content: 'en_US',
            },
            {
                name: 'twitter:description',
                content: event.short_description,
            },
            {
                name: 'og:description',
                content: event.short_description,
            },
        ],
    };
});
</script>
