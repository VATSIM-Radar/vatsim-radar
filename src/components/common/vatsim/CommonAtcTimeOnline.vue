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
    gap: 4px;
    align-items: center;
    justify-content: flex-end;

    width: 100%;

    font-size: 11px;
    font-weight: 300;
    color: $neutral150;

    &_info {
        padding: 2px 4px;
        background: $neutral950;
        border-radius: 4px;
    }
}
</style>
