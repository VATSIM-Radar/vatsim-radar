<template>
    <ui-tabs
        background="darkGray800"
        mobile-vertical
        :model-value="statsTab"
        :tabs="{ airports: { title: 'Airports' }, airlines: { title: 'Airlines' }, aircraft: { title: 'Aircraft' }, routes: { title: 'Routes' }, atc: { title: 'ATC' }, pilots: { title: 'Live Pilots' }, observers: { title: 'Live Observers' } }"
        @update:modelValue="navigateTo({ path: `/stats/${ $event }`, query: route.query })"
    />
</template>

<script setup lang="ts">
import UiTabs from '~/components/ui/data/UiTabs.vue';

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
    padding: 4px 4px 8px;
    border-radius: 4px;
    background: var(--background);
}
</style>
