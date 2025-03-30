<template>
    <common-tooltip
        class="entry-tooltip"
        location='bottom'
        :style="getBoxStyle()"
    >
        <template #activator>
            <div
                class="entry"
                :style="getEntryStyle()"
            >
                <div class="entry-title">
                    <common-scroll-text>
                        <template #text>
                            {{ entry.title }}
                        </template>
                    </common-scroll-text>

                </div>
                <div
                    v-if="entry.details"
                    class="timeline-entry-details"
                />
                <div
                    v-if="entry.color"
                    class="entry-colorbox"
                >
                    <div
                        class="entry-colorbox-color"
                        :style="{ background: entry.color }"
                    />
                </div>
            </div>
        </template>
        <div class="entry-tooltip-container">
            <template v-if="store.mapSettings.bookingsLocalTimezone">
                {{ localStart }} - {{ localEnd }}
            </template>
            <template v-else>
                {{ localStart }}Z - {{ localEnd }}Z
            </template>
        </div>
    </common-tooltip>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { TimelineEntry } from '~/types/data/timeline';
import CommonScrollText from './CommonScrollText.vue';
import CommonTooltip from './CommonTooltip.vue';
import { makeBookingTime } from '~/composables/bookings';
import { useStore } from '~/store';

const props = defineProps({
    entry: {
        type: Object as PropType<TimelineEntry>,
        required: true,
    },
    start: {
        type: Date as PropType<Date>,
        required: true,
    },
    indexOffsetMap: {
        type: Map as PropType<Map<number, number>>,
        required: true,
    },
    rowHeight: {
        type: Number,
        required: true,
    },
    cellWidth: {
        type: Number,
        required: true,
    },
    scale: {
        type: Number,
        required: true,
    },
    gap: {
        type: Number,
        required: true,
    },
});

const store = useStore();

const localStart = computed(() => makeBookingTime(props.entry.start, store.mapSettings.bookingsLocalTimezone ?? false));
const localEnd = computed(() => makeBookingTime(props.entry.end, store.mapSettings.bookingsLocalTimezone ?? false));

function getEntryStyle() {
    const entry = props.entry;
    return {
        height: `${ props.rowHeight - props.gap }px`,
        width: `${ getEntryWidth(entry.start, entry.end) }px`,
    };
}

function getBoxStyle() {
    const entry = props.entry;
    return {
        left: `${ getEntryLeft(entry.start) }px`,
        top: `${ getEntryTop(entry.id) }px`,
        height: `${ props.rowHeight - props.gap }px`,
    };
}

function getEntryLeft(time: Date) {
    const timeDifference = (time.getTime() - props.start.getTime()) / (60 * 60 * 1000);
    const left = timeDifference * props.cellWidth / props.scale;

    return left;
}

function getEntryTop(id: number) {
    return ((id - getSumOffset(id)) * props.rowHeight) + (props.gap / 2);
}

function getEntryWidth(start: Date, end: Date) {
    const duration = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    return duration * props.cellWidth / props.scale;
}

function getSumOffset(index: number): number {
    const sortedKeys = Array.from(props.indexOffsetMap.keys()).sort((a, b) => a - b);
    let sum = 0;
    for (const key of sortedKeys) {
        if (key >= index) break;
        sum += props.indexOffsetMap.get(key) || 0;
    }
    return sum;
}
</script>

<style scoped lang="scss">
.entry {
    position: absolute;
    z-index: 0;

    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    border-radius: 10px;

    font-size: 14px;

    background: rgba(var(--primary300), 0.3);
    box-shadow: 5px 5px 4px varToRgba($darkgray1000, 0.3);

    &-tooltip {
        position: absolute;

        &-container {
            width: max-content;
        }
    }

    &-title {
        display: flex;
        flex-direction: column;
        justify-content: center;

        width: 100%;
        height: 100%;
        padding-right: 8px;
        padding-left: 8px;
    }

    &-colorbox {
        position: relative;

        &-color {
            position: absolute;
            top: -4px;
            width: 100%;
            height: 4px;
        }
    }
}
</style>
