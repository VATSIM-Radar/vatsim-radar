<template>
    <div
        v-if="ready"
        ref="dragContainer"
        class="timeline"
        :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
        @mousedown="startDrag"
        @mouseleave="stopDrag"
        @mousemove="drag"
        @mouseup="stopDrag"
    >
        <div
            v-if="getEntries.length === 0"
            class="timeline-wrong"
        >
            There is no data to be displayed
        </div>
        <div
            v-else-if="start > end"
            class="timeline-wrong"
        >
            Invalid date range: The start date should precede the end date
        </div>
        <div
            v-if="start < end"
            class="header"
        >
            <div class="header-heads">
                <div
                    v-for="header in headers"
                    :key="header.name"
                    class="header-head"
                    :style="widthStyle"
                >
                    {{ header.name }}
                </div>
            </div>
            <!-- Timeline -->
            <div
                class="timeline-timeline"
                @wheel="onWheel"
            >
                <div
                    v-for="day in getTimelineDays"
                    :key="day.id"
                    class="timeline-timeline-day"
                >
                    <span
                        class="timeline-timeline-day-txt"
                        :style="dayStyle"
                    >
                        {{ day.formattedDate }}
                    </span>
                    <div class="timeline-timeline-day-list">
                        <div
                            v-for="time in getTimelineTime(day.day)"
                            :key="time.id"
                            class="timeline-timeline-time"
                            :style="widthStyle"
                        >
                            <span>
                                {{ time.formattedTime }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="timeline-data">
            <!-- Identifiers -->
            <div class="id">
                <div
                    v-for="(col, colIndex) in getIds"
                    :key="colIndex"
                    class="id-row"
                >
                    <template
                        v-for="(row, rowIndex) in col"
                        :key="rowIndex"
                    >
                        <div
                            v-if="!row?.collapsed || row?.collapsable"
                            class="id-cell"
                            :class="idClass(rowIndex, colIndex)"
                            :style="cellStyle"
                            @click="collapse(colIndex, rowIndex)"
                        >
                            <div
                                v-if="!row?.invisible"
                                class="id-box"
                            >
                                <fold-icon
                                    v-if="row?.collapsable && !row?.collapsed"
                                    class="id-icon"
                                />
                                <unfold-icon
                                    v-else-if="row?.collapsable && row?.collapsed"
                                    class="id-icon"
                                />
                                <div
                                    v-else
                                    class="id-icon"
                                />
                                <div
                                    :ref="el => {
                                        if (el) idContainers[`${ colIndex }-${ rowIndex }`] = el as HTMLElement
                                    }"
                                    class="id-box-text"
                                    :style="{ width: `${ cellWidth - 30 }px` }"
                                >
                                    <common-scroll-text>
                                        <template #text>
                                            {{ row?.name ?? '' }}
                                        </template>
                                    </common-scroll-text>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
            <!-- Entries -->
            <div class="timeline-entries">
                <div
                    v-if="showNow"
                    class="timeline-entries-now"
                    :style="nowStyle"
                />
                <!-- Entries -->
                <div class="timeline-entries-list">
                    <template
                        v-for="entry in getEntries"
                        :key="entry.id + entry.start.getTime()"
                    >
                        <common-timeline-entry
                            v-if="!entry.collapsed"
                            :cell-width
                            :entry
                            :gap
                            :index-offset-map
                            :row-height
                            :scale
                            :start
                        />
                    </template>
                    <template
                        v-for="cEntry in flattenedCollapsedEntries"
                        :key="cEntry.id + cEntry.start.getTime()"
                    >
                        <common-timeline-entry
                            :cell-width
                            class="timeline-entries-collapsed"
                            :entry="cEntry"
                            :gap
                            :index-offset-map
                            :row-height
                            :scale
                            :start
                            @click="uncollapseEntry(cEntry)"
                        />
                    </template>
                </div>
            </div>
            <div :style="{ width: (getTimeline.length * cellWidth) + 'px' }"/>
        </div>
    </div>
    <div
        v-else
        class="loading-screen"
    >
        <div class="loader"/>
    </div>
</template>

<script setup lang="ts">
import type { TimelineEntry, TimelineHeader, TimelineIdentifier } from '~/types/data/timeline';
import type { PropType } from 'vue';
import FoldIcon from '@/assets/icons/kit/fold.svg?component';
import UnfoldIcon from '@/assets/icons/kit/unfold.svg?component';
import CommonTimelineEntry from './CommonTimelineEntry.vue';
import CommonScrollText from './CommonScrollText.vue';

interface TimelineTime {
    id: number; date: Date; formattedDate: string; formattedTime: string; day: number;
}

const props = defineProps({
    headers: {
        type: Array as PropType<TimelineHeader[]>,
        required: true,
    },
    identifiers: {
        type: Array as PropType<(TimelineIdentifier | null)[][]>,
        required: true,
    },
    entries: {
        type: Array as PropType<TimelineEntry[]>,
        required: true,
    },
    start: {
        type: Date as PropType<Date>,
        required: true,
    },
    end: {
        type: Date as PropType<Date>,
        required: true,
    },
    scale: {
        type: Number,
        required: false,
        default: 1,
    },
    collapsed: {
        type: Boolean,
        required: false,
    },
    utc: {
        type: Boolean,
        required: false,
    },
});

const isMobile = useIsMobile();

const ready = ref(false);

const cellWidth = computed(() => isMobile.value ? 80 : 120);
const rowHeight = 50;
const gap = 4;
const headerWidth = computed(() => props.headers.length * cellWidth.value);

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const scale = ref(props.scale);

const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const dragContainer = ref<HTMLElement | null>(null);

const scrollSpeed = 5;
const scrollDown = ref(0);
const scrollUp = ref(0);
const scaleIngrement = ref(0.5);

const nowStyle = computed(() => ({ left: getEntryLeft(currentMinute.value) + 'px' }));
const cellStyle = computed(() => {
    return {
        ...widthStyle.value,
        ...heightStyle.value,
    };
});

const widthStyle = computed(() => {
    return {
        minWidth: `${ cellWidth.value }px`,
        maxWidth: `${ cellWidth.value }px`,
    };
});

const heightStyle = computed(() => {
    return {
        minHeight: `${ rowHeight }px`,
        maxHeight: `${ rowHeight }px`,
    };
});

const dayStyle = computed(() => {
    if (!isMobile.value) {
        return { left: (headerWidth.value + 30) + 'px' };
    }
    else {
        return { left: 0 };
    }
});

const idContainers = ref<{ [key: string]: HTMLElement | null }>({});
const collapsedEntries = ref<Map<number, TimelineEntry[]>>(new Map());
const indexOffsetMap = ref<Map<number, number>>(new Map());
const collapseMap = ref(new Map<string, boolean>());

const endCalculated = computed(() => {
    if (props.end) {
        return props.end;
    }

    let tmp = new Date();
    props.entries.forEach(entry => {
        if (entry.end > tmp) {
            tmp = new Date(entry.end.getTime());
        }
    });

    return tmp;
});

const currentMinute = ref(new Date());

const timeZone = computed(() => props.utc ? 'UTC' : undefined);

const formatterTime = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone.value,
}));

const formatterDate = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    day: '2-digit',
    month: '2-digit',
    timeZone: timeZone.value,
}));

const getIds: ComputedRef<(TimelineIdentifier | null)[][]> = computed(() => {
    return props.identifiers.map((col, colIndex) => col.map((row, rowIndex) => {
        if (row === null) return null;

        const newRow = { ...row };
        if (newRow.collapsable) {
            const rows = countChildRows(colIndex, rowIndex, props.identifiers);
            if (rows < 1) {
                newRow.collapsable = false;
            }
        }
        return newRow;
    }));
});

const getEntries = computed<TimelineEntry[]>(() => {
    return props.entries.filter(entry => {
        let start = new Date(entry.start.getTime());
        let end = new Date(entry.end.getTime());

        if (start <= props.start) {
            if (end <= props.start) {
                return false;
            }
            start = new Date(props.start.getTime());
        }

        if (end >= endCalculated.value) {
            if (start >= endCalculated.value) {
                return false;
            }
            end = new Date(endCalculated.value.getTime());
        }

        return true;
    }).map(entry => ({
        ...entry,
        collapsed: false,
        start: new Date(Math.max(entry.start.getTime(), props.start.getTime())),
        end: new Date(Math.min(entry.end.getTime(), endCalculated.value.getTime())),
    }));
});

const getTimeline: Ref<TimelineTime[]> = computed(() => generateTimeline());
const getTimelineDays: Ref<TimelineTime[]> = computed(() => generateTimelineDays());

const flattenedCollapsedEntries = computed(() => Array.from(collapsedEntries.value.values()).flatMap(entries => entries));

const showNow = computed(() => {
    return currentMinute.value > props.start && currentMinute.value < props.end;
});

watch(() => ({
    start: props.start.getTime(),
    end: props.end.getTime(),
    entries: getEntries.value,
}), async () => {
    collapsedEntries.value.clear();
    indexOffsetMap.value.clear();
    await nextTick();
    collapseByMap();
});

onMounted(() => {
    const interval = setInterval(() => {
        const now = new Date();
        if (now.getMinutes() !== currentMinute.value.getMinutes()) {
            currentMinute.value = now;
        }
    }, 1000);

    onBeforeUnmount(() => {
        clearInterval(interval);
    });

    if (props.collapsed) {
        getIds.value.forEach(col => {
            col.forEach(row => {
                if (row?.collapsable) {
                    collapseMap.value.set(row.name, true);
                }
            });
        });
    }

    collapseByMap();

    ready.value = true;
});

function collapseByMap() {
    for (let colIndex = 0; colIndex < getIds.value.length; colIndex++) {
        const col = getIds.value[colIndex];
        for (let rowIndex = 0; rowIndex < col.length; rowIndex++) {
            const row = col[rowIndex];
            if (row?.collapsable) {
                if (collapseMap.value.has(row.name)) {
                    if (collapseMap.value.get(row.name)) {
                        if (!row.collapsed) {
                            collapse(colIndex, rowIndex);
                        }
                    }
                }
            }
        }
    }
}

function uncollapseEntry(entry: TimelineEntry) {
    const rowIndex = entry.id;
    let colIndex = 0;
    let found = false;

    for (colIndex; colIndex < getIds.value.length; colIndex++) {
        if (getIds.value[colIndex][rowIndex]?.collapsable) {
            found = true;
            break;
        }
    }

    if (found) {
        collapse(colIndex, rowIndex);
    }
}

function collapseEntries(startId: number, endId: number, collapsed: boolean) {
    getEntries.value.forEach(entry => {
        if (entry.id >= startId && entry.id <= endId) {
            entry.collapsed = collapsed;
        }
    });
}

function countChildRows(colIndex: number, rowIndex: number, source: (TimelineIdentifier | null)[][]) {
    let rowsToCollapse = 0;
    for (let i = rowIndex + 1; i < source[colIndex].length; i++) {
        if (source[colIndex][i] && !source[colIndex][i]?.invisible) {
            break;
        }
        rowsToCollapse++;
    }

    return rowsToCollapse;
}

function collapse(colIndex: number, rowIndex: number) {
    if (!getIds.value[colIndex] || !getIds.value[colIndex][rowIndex]?.collapsable) {
        return;
    }

    const identifier = getIds.value[colIndex][rowIndex];
    const isCurrentlyCollapsed = (identifier.collapsed ?? false);

    const rowsToCollapse = countChildRows(colIndex, rowIndex, getIds.value);

    if (rowsToCollapse < 1) {
        return;
    }

    getIds.value[colIndex][rowIndex] = {
        ...identifier,
        collapsed: !isCurrentlyCollapsed,
    };

    collapseRow(colIndex, rowIndex, rowsToCollapse, !isCurrentlyCollapsed);
    collapseEntries(rowIndex, rowIndex + rowsToCollapse, !isCurrentlyCollapsed);

    if (isCurrentlyCollapsed) {
        collapsedEntries.value.delete(rowIndex);
        indexOffsetMap.value.delete(rowIndex);
    }
    else {
        indexOffsetMap.value.set(rowIndex, rowsToCollapse);
        makeCollapsedEntry(rowIndex, rowsToCollapse, identifier.name);
    }

    collapseMap.value.set(identifier.name, !isCurrentlyCollapsed);
}

function collapseRow(colIndex: number, rowIndex: number, rows: number, collapsed: boolean) {
    for (let i = colIndex; i < getIds.value.length; i++) {
        const column = getIds.value[i];
        if (column) {
            for (let j = rowIndex + 1; j < rowIndex + rows + 1; j++) {
                const item = column[j];
                if (item) {
                    if ('collapsed' in item) {
                        item.collapsed = collapsed;
                    }
                    else {
                        column[j] = { ...item, collapsed: collapsed } as TimelineIdentifier;
                    }
                }
                else {
                    column[j] = { name: '', collapsed: collapsed, invisible: true } as TimelineIdentifier;
                }
            }
        }
    }

    for (let i = colIndex + 1; i < getIds.value.length; i++) {
        const id = getIds.value[i][rowIndex];
        if (id) {
            id.invisible = collapsed;
        }
    }
}


function getEntryLeft(time: Date) {
    const timeDifference = (time.getTime() - props.start.getTime()) / (60 * 60 * 1000);
    return (timeDifference * cellWidth.value) / scale.value;
}

function makeCollapsedEntry(rowIndex: number, rows: number, title: string) {
    if (collapsedEntries.value.has(rowIndex)) {
        return;
    }

    const relevantEntries = getEntries.value
        .filter(entry => entry.id >= rowIndex && entry.id < rowIndex + rows);

    if (relevantEntries.length === 0) return;

    const mergedEntries: TimelineEntry[] = [];
    let currentMerged = getCurrentMerged(relevantEntries[0].start, relevantEntries[0].end, rowIndex, title);

    for (let i = 1; i < relevantEntries.length; i++) {
        const current = relevantEntries[i];

        if (current.start <= currentMerged.end) {
            currentMerged = getCurrentMerged(currentMerged.start, new Date(Math.max(currentMerged.end.getTime(), current.end.getTime())), rowIndex, title);
        }
        else {
            mergedEntries.push(currentMerged);
            currentMerged = getCurrentMerged(current.start, current.end, rowIndex, title);
        }
    }

    mergedEntries.push(currentMerged);

    collapsedEntries.value.set(rowIndex, mergedEntries);
}


function getCurrentMerged(start: Date, end: Date, id: number, title: string): TimelineEntry {
    return {
        start: start,
        end: end,
        title: title,
        id: id,
        collapsed: false,
    };
}

function idClass(rowIndex: number, colIndex: number) {
    const classes: string[] = [];
    if (colIndex > 0) {
        if (getIds.value[colIndex - 1][rowIndex] && !getIds.value[colIndex - 1][rowIndex]?.invisible) {
            classes.push('id-cell-start');
        }

        if (getIds.value[colIndex - 1].length > rowIndex + 1) {
            if (getIds.value[colIndex - 1][rowIndex + 1] && !getIds.value[colIndex - 1][rowIndex + 1]?.invisible) {
                classes.push('id-cell-end');
            }
        }
    }
    else {
        classes.push('id-cell-left');

        if (getIds.value[colIndex][rowIndex] && !getIds.value[colIndex][rowIndex]?.invisible) {
            classes.push('id-cell-start');
        }

        if (getIds.value[colIndex].length > rowIndex + 1) {
            if (getIds.value[colIndex][rowIndex + 1] && !getIds.value[colIndex][rowIndex + 1]?.invisible) {
                classes.push('id-cell-end');
            }
        }
    }

    if (getIds.value.length - 1 === colIndex) {
        classes.push('id-cell-right');
    }

    if (rowIndex == 0) {
        classes.push('id-cell-start');
    }

    if (getIds.value[colIndex].length - 1 === rowIndex) {
        classes.push('id-cell-end');
    }

    if (getIds.value[colIndex][rowIndex]?.collapsable) {
        classes.push('id-collapse');
    }

    return classes;
}

function getTimelineTime(day: number): TimelineTime[] {
    return getTimeline.value.filter(e => {
        return e.day === day;
    });
}

function generateTimelineDays(): TimelineTime[] {
    return getTimeline.value.reduce((acc: TimelineTime[], current: TimelineTime) => {
        if (!acc.some(item => item.day === current.day)) {
            acc.push(current);
        }
        return acc;
    }, []);
}

function generateTimeline(): TimelineTime[] {
    const scaleInMinutes = scale.value * 60;
    const timeSlots = [];
    let day = 0;
    let before = new Date(props.start.getTime());

    for (
        let i = new Date(props.start.getTime());
        i < endCalculated.value;
        i.setMinutes(i.getMinutes() + scaleInMinutes)
    ) {
        if (i.getDay() !== before.getDay()) {
            day++;
            before = new Date(i);
        }

        timeSlots.push({
            id: i.getTime(),
            date: new Date(i.getTime()),
            day: day,
            formattedDate: formatterDate.value.format(i),
            formattedTime: formatterTime.value.format(i),
        });
    }

    return timeSlots;
}

function onWheel(event: WheelEvent) {
    if (event.deltaY > 0) {
        event.preventDefault();
        event.stopPropagation();
        scrollUp.value++;
        if (scrollUp.value === scrollSpeed) {
            scale.value = Math.min(scale.value + scaleIngrement.value, 5);
            scrollUp.value = 0;
        }
    }
    if (event.deltaY < 0) {
        event.preventDefault();
        event.stopPropagation();
        scrollDown.value++;
        if (scrollDown.value === scrollSpeed) {
            scale.value = Math.max(scale.value - scaleIngrement.value, 0.5);
            scrollDown.value = 0;
        }
    }
}

function startDrag(event: MouseEvent) {
    if (dragContainer.value) {
        isDragging.value = true;
        startX.value = event.clientX;
        startY.value = event.clientY;
    }
}

function drag(event: MouseEvent) {
    if (isDragging.value && dragContainer.value) {
        const deltaX = event.clientX - startX.value;
        const deltaY = event.clientY - startY.value;

        dragContainer.value.scrollLeft -= deltaX;
        dragContainer.value.scrollTop -= deltaY;

        startX.value = event.clientX;
        startY.value = event.clientY;
    }
}

function stopDrag() {
    isDragging.value = false;
}
</script>


<style scoped lang="scss">
.wrapper {
    scrollbar-width: none;
    overflow: auto;
    width: 100%;

    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
    }
}

.header {
    position: sticky;
    z-index: 8;
    top: 0;

    display: flex;
    flex-direction: row;
    align-items: center;

    width: fit-content;
    padding-top: 8px;
    padding-right: 4px;
    border-bottom: solid;
    border-bottom-color: $darkgray900;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;

    background: $darkgray1000;

    &-heads {
        position: sticky;
        z-index: 6;
        left: 0;

        display: flex;
        flex-direction: row;

        height: 100%;
        border-right: solid;
        border-right-color: $darkgray900;

        background: $darkgray1000;

        @include mobileOnly {
            position: static;
        }
    }

    &-head {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

.id {
    cursor: default;

    position: sticky;
    z-index: 5;
    left: 0;

    display: flex;
    flex-direction: row;

    border-right: solid;
    border-right-color: $darkgray900;
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;

    background: $darkgray1000;

    @include mobileOnly {
        position: static;
    }

    &-icon {
        z-index: 6;
        width: 19px;
        border-radius: 5px;
        background: $darkgray1000;
    }

    &-collapse {
        cursor: pointer;
    }

    &-box {
        display: flex;
        align-items: center;

        &-text {
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: left;

            padding-right: 5px;
        }
    }

    &-cell {
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: left;

        margin: auto;
        padding-top: 6px;
        padding-right: 6px;
        padding-bottom: 6px;
    }
}

.timeline {
    user-select: none;
    scrollbar-width: none;

    overflow: auto;
    display: flex;
    flex-direction: column;

    height: 80vh;

    &-data {
        position: sticky;
        top: 0;

        display: flex;
        flex-direction: row;

        width: fit-content;
    }

    &-timeline {
        z-index: 2;
        display: flex;
        padding-bottom: 8px;

        &-day {
            position: relative;
            left: 0;

            display: flex;
            flex-direction: column;
            gap: 6px;

            &-list {
                display: flex;
                flex-direction: row;
            }

            &-txt {
                position: sticky;

                width: fit-content;
                padding: 8px;
                border-radius: 8px;

                background-color: rgba(var(--darkgray900), 0.9);
                box-shadow: inset -3px -3px 7px rgba(black, 0.3);
            }
        }

        &-time {
            position: relative;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 8px;
            border-radius: 8px;

            background-color: rgba(var(--darkgray900), 0.9);
            box-shadow: inset -3px -3px 7px rgba(black, 0.3);
        }
    }

    &-entries {
        position: relative;
        display: flex;
        flex-direction: column;
        width: fit-content;

        &-now {
            position: absolute;
            z-index: 1;

            width: 2px;
            height: 100%;

            background-color: rgba(255, 0, 0, 0.8);

            &::after {
                content: "Now";

                position: sticky;
                top: 165px;
                transform: rotate(-90deg);

                display: inline-block;

                padding: 4px;
                border-radius: 10px;

                color: currentColor;

                background-color: $darkgray800;
            }
        }

        &-collapsed {
            cursor: pointer;
        }

        &-list {
            position: relative;
            width: fit-content;
        }
    }

    &-wrong {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 100%;
        height: 20vh;

        color: $error300;
    }

    @include mobileOnly {
        height: 90vh;
    }
}

.loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
}

.loader {
    transform: rotateZ(45deg);

    width: 48px;
    height: 48px;
    border-radius: 50%;

    color: white;

    perspective: 1000px;

    &::before,
    &::after {
        content: '';

        position: absolute;
        top: 0;
        left: 0;
        transform: rotateX(70deg);

        display: block;

        width: inherit;
        height: inherit;
        border-radius: 50%;

        animation: 1s spin linear infinite;
    }

    &::after {
        transform: rotateY(70deg);
        color: $primary700;
        animation-delay: .4s;
    }
}

@keyframes rotate {
    0% {
        transform: translate(-50%, -50%) rotateZ(0deg);
    }

    100% {
        transform: translate(-50%, -50%) rotateZ(360deg);
    }
}

@keyframes rotateccw {
    0% {
        transform: translate(-50%, -50%) rotate(0deg);
    }

    100% {
        transform: translate(-50%, -50%) rotate(-360deg);
    }
}

@keyframes spin {
    0%,
    100% {
        box-shadow: .2em 0 0 0 currentcolor;
    }

    12% {
        box-shadow: .2em .2em 0 0 currentcolor;
    }

    25% {
        box-shadow: 0 .2em 0 0 currentcolor;
    }

    37% {
        box-shadow: -.2em .2em 0 0 currentcolor;
    }

    50% {
        box-shadow: -.2em 0 0 0 currentcolor;
    }

    62% {
        box-shadow: -.2em -.2em 0 0 currentcolor;
    }

    75% {
        box-shadow: 0 -.2em 0 0 currentcolor;
    }

    87% {
        box-shadow: .2em -.2em 0 0 currentcolor;
    }
}
</style>
