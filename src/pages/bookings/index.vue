<template>
    <common-page-block>
        <template #title>
            VATSIM Bookings
            <div class="sub-title">
                For the next 2 Days
            </div>
        </template>
        <common-timeline
            collapsed
            :end="end"
            :entries="bookingTimelineEntries"
            :headers="[{ name: 'Airport' }, { name: 'Facility' }]"
            :identifiers="bookingTimelineIdentifiers"
            :start="start"
        />
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { VatsimBooking } from '~/types/data/vatsim';
import type { TimelineEntry, TimelineIdentifier } from '~/types/data/timeline';
import CommonTimeline from '~/components/common/basic/CommonTimeline.vue';

const isMobile = useIsMobile();
const start = new Date(Date.now());
start.setMinutes(0);
const end = new Date(start.getTime());
start.setMinutes(-60 * (isMobile.value ? 2 : 4));
end.setMinutes((60 * 24 * 2) + (60 * (isMobile.value ? 2 : 4)));

const { data } = await useAsyncData('bookings', async () => {
    return $fetch<VatsimBooking[]>('/api/data/vatsim/bookings', {
        query: { starting: start.getTime(), ending: end.getTime() },
    });
});

const bookingTimelineIdentifiers = makeBookingTimelineIds();
const bookingTimelineEntries = makeBookingTimelineEntries();

function makeBookingTimelineEntries() {
    const entries: Array<TimelineEntry> = [];
    const groupMap = new Map();

    bookingTimelineIdentifiers.forEach((group, groupIndex) => {
        group.forEach((subgroup, subgroupIndex) => {
            if (subgroup) {
                groupMap.set(subgroup.name, { groupIndex, subgroupIndex });
            }
        });
    });

    data.value?.forEach(booking => {
        const { groupIndex, subgroupIndex } = groupMap.get(booking.atc.callsign) || {};

        if (new Date(booking.end) < start || new Date(booking.start) > end) return;

        if (groupIndex !== undefined && subgroupIndex !== undefined) {
            const entry: TimelineEntry = {
                start: new Date(booking.start),
                end: new Date(booking.end),
                title: booking.atc.callsign,
                id: subgroupIndex,
            };
            entries.push(entry);
        }
    });

    return entries;
}

function makeBookingTimelineIds(): (TimelineIdentifier | null)[][] {
    const groups = new Map<string, Set<string>>();

    if (!data.value) {
        return [[]];
    }

    const bookings = data.value.sort((a, b) => a.atc.facility - b.atc.facility);

    for (const booking of bookings) {
        if (new Date(booking.end) < start || new Date(booking.start) > end) continue;

        const [groupKey] = booking.atc.callsign.split('_');
        const callsign = booking.atc.callsign;

        if (!groups.has(groupKey)) {
            groups.set(groupKey, new Set());
        }
        groups.get(groupKey)!.add(callsign);
    }

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
}

useHead({
    title: 'Bookings',
});
</script>

<style scoped lang="scss">
.sub-title {
    margin-top: 10px;
    font-size: 16px;
    font-weight: 600;
    color: $lightgray200;

    @include mobileOnly {
        font-size: 12px;
    }
}
</style>
