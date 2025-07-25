<template>
    <common-tabs
        mobile-vertical
        :model-value="statsTab"
        :tabs="{ airports: { title: 'Airports' }, airlines: { title: 'Airlines' }, aircraft: { title: 'Aircraft' }, routes: { title: 'Routes' }, pilots: { title: 'Pilots' }, atc: { title: 'ATC' }, observers: { title: 'Observers' } }"
        @update:modelValue="navigateTo({ path: `/stats/${ $event }` })"
    />
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';

const props = defineProps({
    pageTitle: {
        type: String,
    },
});

const route = useRoute();

const statsTab = computed(() => {
    return route.path.split('/')[2] ?? '';
});

useHead(() => ({
    title: props.pageTitle || `${ statsTab.value[0].toUpperCase() }${ statsTab.value.slice(1, statsTab.value.length) }`,
    titleTemplate(title) {
        return `${ title } | VATSIM Radar Stats`;
    },
}));
</script>

<style lang="scss" scoped>
div.tabs {
    margin-bottom: 8px;
    padding: 16px;
    border-radius: 16px;
    background: $darkgray900;

    :deep(.tabs_list) {
        background: $darkgray900;
    }

    :deep(.tabs_tab::after) {
        background: $darkgray900;
    }
}
</style>
