<template>
    <div class="stats">
        <nuxt-page/>
    </div>
</template>

<script setup lang="ts">
setupDataFetch();

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
        position: relative;
        left: 50%;
        transform: translateX(-50%);

        display: flex;
        align-items: center;
        justify-content: center;

        width: 32px;
        min-width: 32px;
        height: 32px;
        border-radius: 100%;

        &.stats__place--0, &.stats__place--1, &.stats__place--2 {
            color: $brandPrimary;
            background: $blue500Alpha12;
        }
    }

    :deep(.stats__virtual--active) {
        color: $blue400;
    }

    :deep(.stats__action) {
        margin: -8px 0;
    }
}
</style>
