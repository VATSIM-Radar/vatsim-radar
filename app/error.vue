<template>
    <nuxt-layout>
        <view-error404 v-if="'statusCode' in error && error.statusCode === 404"/>
        <view-error500
            v-else
            :error="error"
        />
    </nuxt-layout>
</template>

<script setup lang="ts">
import type { INuxtError } from '~/types';
import ViewError404 from '~/components/views/ViewError404.vue';
import type { PropType } from 'vue';
import ViewError500 from '~/components/views/ViewError500.vue';

defineProps({
    error: {
        type: Object as PropType<Partial<INuxtError>>,
        required: true,
    },
});
</script>
