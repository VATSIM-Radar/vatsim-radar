<template>
    <div class="atc-time">
        <div class="atc-time_text">
            Time online:
        </div>
        <div class="atc-time_info">
            {{ getATCTime(controller) }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { getATCTime } from '~/composables/atc';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { PropType } from 'vue';
defineProps({
    controller: {
        type: Object as PropType<VatsimShortenedController>,
        required: true,
    },
});
</script>

<style scoped lang="scss">
.atc-time {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    color: $neutral150;
    font-size: 11px;
    gap: 4px;
    font-weight: 300;
    width: 100%;

    &_info {
        background: $neutral950;
        padding: 2px 4px;
        border-radius: 4px;
    }
}
</style>
