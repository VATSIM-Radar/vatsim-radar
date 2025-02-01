<template>
    <div class="stats">
        <nuxt-page/>
    </div>
</template>

<script setup lang="ts">
onMounted(() => {
    setupDataFetch();
});

const route = useRoute();

if (route.path === '/stats') {
    navigateTo({
        path: '/stats/airlines',
    });
}
</script>

<style scoped lang="scss">
.stats {
    :deep(.stats__place) {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 32px;
        height: 32px;
        margin: -8px 0;
        border-radius: 100%;

        &.stats__place--0, &.stats__place--1, &.stats__place--2 {
            color: $lightgray100Orig;
            background: $primary500;
        }
    }

    :deep(.stats__virtual--active) {
        color: $primary400;
    }

    :deep(.stats__action) {
        margin: -8px 0;
    }
}
</style>
