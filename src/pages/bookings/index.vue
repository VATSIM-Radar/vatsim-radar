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
        </div>
        <common-timeline
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

const collapsed = ref(false);
const isMobile = useIsMobile();
const start = new Date(Date.now());
start.setMinutes(0);
const end = new Date(start.getTime());
start.setMinutes(-60 * (isMobile.value ? 2 : 4));
end.setMinutes((60 * 24 * 2) + (60 * (isMobile.value ? 2 : 4)));

const fetchStart = ref(start);
const fetchEnd = ref(end);

const dateRange = ref({
    from: start,
    to: end,
});

const data = ref(await fetchBookings());

const bookingTimelineIdentifiers = computed(() => makeBookingTimelineIds());
const bookingTimelineEntries = computed(() => makeBookingTimelineEntries());

watch(dateRange, async () => {
    if (fetchStart.value > dateRange.value.from || fetchEnd.value < dateRange.value.to) {
        data.value = await fetchBookings();

        fetchStart.value = new Date(Math.min(fetchStart.value.getTime(), dateRange.value.from.getTime()));
        fetchEnd.value = new Date(Math.max(fetchEnd.value.getTime(), dateRange.value.to.getTime()));
    }
});

async function fetchBookings() {
    return await $fetch<VatsimBooking[]>('/api/data/vatsim/bookings', {
        query: { starting: start.getTime(), ending: end.getTime() },
    });
}

onMounted(() => {
    const store = useStore();
    store.getVATSIMData();
});

function makeBookingTimelineEntries(): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    const groupMap = new Map<string, { groupIndex: number; subgroupIndex: number }>();

    bookingTimelineIdentifiers.value.forEach((group, groupIndex) => {
        group.forEach((subgroup, subgroupIndex) => {
            if (subgroup) {
                groupMap.set(subgroup.name, { groupIndex, subgroupIndex });
            }
        });
    });

    data.value?.forEach(booking => {
        if (booking.end >= dateRange.value.from.getTime() && booking.start <= dateRange.value.to.getTime()) {
            const groupInfo = groupMap.get(booking.atc.callsign);
            if (groupInfo) {
                entries.push({
                    start: new Date(Math.max(booking.start, dateRange.value.from.getTime())),
                    end: new Date(Math.min(booking.end, dateRange.value.to.getTime())),
                    title: booking.atc.callsign,
                    id: groupInfo.subgroupIndex,
                    color: getControllerPositionColor(booking.atc),
                });
            }
        }
    });

    return entries;
}

function makeBookingTimelineIds(): (TimelineIdentifier | null)[][] {
    const groups = new Map<string, Set<string>>();

    if (!data.value) return [[]];

    data.value
        .sort((a, b) => b.atc.facility - a.atc.facility)
        .forEach(booking => {
            if (booking.end >= dateRange.value.from.getTime() && booking.start <= dateRange.value.to.getTime()) {
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
}

function viewOnMap() {
    location.href = `/?start=${ dateRange.value.from.getTime() }&end=${ dateRange.value.to.getTime() }`;
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
