<template>
    <div class="atc-time">
        <div class="atc-time_text">
            Time online:
        </div>
        <div class="atc-time_info">
            {{ getATCTime(controller) }}
        </div>
        <div
            v-if="full && controller.logon_time"
            class="atc-time_text"
        >
            since {{formatter.format(new Date(controller.logon_time))}}z
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
    full: {
        type: Boolean,
        default: false,
    },
});

const store = useStore();

const formatter = new Intl.DateTimeFormat(['en-DE'], {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
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
    color: $lightgray150;

    &_info {
        padding: 2px 4px;
        border-radius: 4px;
        background: $darkgray950;
    }
}
</style>
