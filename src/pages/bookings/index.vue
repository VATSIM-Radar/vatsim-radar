<template>
    <common-page-block>
        <div class="picker">
            <template v-if="!isMobile && !collapsed">
                <common-date-picker v-model="dateRange"/>
                <common-button
                    type="primary"
                    @click="viewOnMap()"
                >
                    View on Map
                </common-button>
            </template>
            <common-toggle
                :model-value="store.mapSettings.bookingsLocalTimezone ?? false"
                @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
            >
                Bookings local time
            </common-toggle>
        </div>
        <common-timeline
            v-if="bookingsData"
            collapsed
            :end="dateRange.to"
            :entries="bookingTimelineEntries"
            :headers="[{ name: 'Airport' }, { name: 'Facility' }]"
            :identifiers="bookingTimelineIdentifiers"
            :start="dateRange.from"
        />
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { VatsimBooking } from '~/types/data/vatsim';
import type { TimelineEntry, TimelineIdentifier } from '~/types/data/timeline';
import CommonTimeline from '~/components/common/basic/CommonTimeline.vue';
import CommonDatePicker from '~/components/common/basic/CommonDatePicker.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';
import type { DateRange } from '~/components/common/basic/CommonDatePicker.vue';
import type { Reactive } from 'vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';

const collapsed = ref(false);
const isMobile = useIsMobile();
const initialStart = new Date(Date.now());
initialStart.setMinutes(0);
const initialEnd = new Date(initialStart.getTime());
initialStart.setMinutes(-60 * (isMobile.value ? 2 : 4));
initialEnd.setMinutes((60 * 24 * 2) + (60 * (isMobile.value ? 2 : 4)));

const fetchStart = ref(initialStart);
const fetchEnd = ref(initialEnd);

const dateRange: Reactive<DateRange> = reactive({
    from: new Date(initialStart),
    to: new Date(initialEnd),
});

const { data, refresh } = await useAsyncData('bookings', () => $fetch<VatsimBooking[]>('/api/data/vatsim/bookings', {
    query: { starting: initialStart.getTime(), ending: initialEnd.getTime() },
}), {
    server: false,
});

const store = useStore();
const { data: bookingsData } = await useAsyncData('bookings-data', async () => {
    await store.getVATSIMData();
    return true;
}, {
    server: false,
});

const sortedData = computed(() => {
    return (data.value ?? [])
        .slice(0)
        .sort((a, b) => b.atc.facility - a.atc.facility)
        .sort((a, b) => a.start - b.start);
});

const bookingTimelineIdentifiers = computed(() => {
    const groups = new Map<string, Set<string>>();

    if (!sortedData.value) return [[]];

    sortedData.value
        .forEach(booking => {
            if (booking.end >= dateRange.from.getTime() && booking.start <= dateRange.to.getTime()) {
                const [groupKey] = booking.atc.callsign.split('_');
                if (!groups.has(groupKey)) groups.set(groupKey, new Set());
                groups.get(groupKey)!.add(booking.atc.callsign);
            }
        });

    const [groupIds, facilityIds] = Array.from(groups).reduce<[TimelineIdentifier[], TimelineIdentifier[]]>(
        ([groupAcc, facilityAcc], [groupKey, facilities]) => {
            groupAcc.push({ name: groupKey, collapsable: true });
            groupAcc.push(...Array(facilities.size - 1).fill(null));
            facilityAcc.push(...Array.from(facilities).map(facility => ({ name: facility })));
            return [groupAcc, facilityAcc];
        },
        [[], []],
    );

    return [groupIds, facilityIds];
});
const bookingTimelineEntries = computed(() => {
    const entries: TimelineEntry[] = [];
    const groupMap = new Map<string, { groupIndex: number; subgroupIndex: number }>();

    bookingTimelineIdentifiers.value.forEach((group, groupIndex) => {
        group.forEach((subgroup, subgroupIndex) => {
            if (subgroup) {
                groupMap.set(subgroup.name, { groupIndex, subgroupIndex });
            }
        });
    });

    sortedData.value.forEach(booking => {
        if (booking.end >= dateRange.from.getTime() && booking.start <= dateRange.to.getTime()) {
            const groupInfo = groupMap.get(booking.atc.callsign);
            if (groupInfo) {
                entries.push({
                    start: new Date(Math.max(booking.start, dateRange.from.getTime())),
                    end: new Date(Math.min(booking.end, dateRange.to.getTime())),
                    title: booking.atc.callsign,
                    id: groupInfo.subgroupIndex,
                    color: getControllerPositionColor(booking.atc),
                });
            }
        }
    });

    return entries;
});

watch(dateRange, async () => {
    if (fetchStart.value > dateRange.from || fetchEnd.value < dateRange.to) {
        await refresh();

        fetchStart.value = new Date(Math.min(fetchStart.value.getTime(), dateRange.from.getTime()));
        fetchEnd.value = new Date(Math.max(fetchEnd.value.getTime(), dateRange.to.getTime()));
    }
});

function viewOnMap() {
    location.href = `/?start=${ dateRange.from.getTime() }&end=${ dateRange.to.getTime() }`;
}

useHead({
    title: 'Bookings',
});
</script>

<style scoped lang="scss">
.picker {
    display: flex;
    flex-direction: column;
    align-items: center;

    width: 100%;
    margin-bottom: 10px;
}
</style>
