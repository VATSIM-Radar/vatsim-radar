<template>
    <common-page-block>
        <div class="picker">
            <template
                v-if="!isMobile && !collapsed"
            >
                <div class="picker-presets">
                    <common-button
                        primary-color="primary600"
                        @click="changeRange('today')"
                    >Today</common-button>
                    <common-button
                        primary-color="primary600"
                        @click="changeRange('todayTomorrow')"
                    >Today + Tomorrow</common-button>
                    <common-button
                        primary-color="primary600"
                        @click="changeRange('today7Days')"
                    >Today + 7 Days</common-button>
                    <div class="picker-presets-custom">
                        <div>Now</div> + <common-input-text
                            v-model="presetHours"
                            input-type="number"
                            placeholder="4"
                        /> Hours <common-button
                            hover-color="success700"
                            primary-color="success400"
                            @click="changeRange('custom')"
                        >Apply</common-button>
                    </div>
                </div>


                <div class="picker-picker">
                    <common-date-picker v-model="dateRange"/>
                    <common-button
                        primary-color="primary600"
                        type="primary"
                        @click="viewOnMap()"
                    >
                        View on Map
                    </common-button>
                    <common-toggle
                        class="picker-localtime"
                        :model-value="store.mapSettings.bookingsLocalTimezone ?? false"
                        @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
                    >
                        Bookings local time
                    </common-toggle>
                </div>
            </template>
        </div>
        <div class="booking-sort-container">
            <common-button
                :disabled="sortMode === 'airport'"
                hover-color="info700"
                primary-color="info500"
                @click="sortMode = 'airport'"
            >
                Sort by Airport
            </common-button>
            <common-button
                :disabled="sortMode === 'date'"
                hover-color="info700"
                primary-color="info500"
                @click="sortMode = 'date'"
            >
                Sort by Date
            </common-button>
            <common-input-text
                v-model="searchString"
                class="booking-sort-search"
            >
                <template #icon>
                    <search-icon width="16"/>
                </template>
            </common-input-text>
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
import SearchIcon from '@/assets/icons/kit/search.svg?component';
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
import CommonInputText from '~/components/common/basic/CommonInputText.vue';

const collapsed = ref(false);
const isMobile = useIsMobile();
const initialStart = new Date(Date.now());
initialStart.setMinutes(0);
const initialEnd = new Date(initialStart.getTime());
initialStart.setMinutes(-60 * (isMobile.value ? 2 : 4));
initialEnd.setMinutes((60 * 24 * 2) + (60 * (isMobile.value ? 2 : 4)));

const sortMode: Ref<'airport' | 'date'> = ref('date');
const presetHours = ref('4');

const fetchStart = ref(initialStart);
const fetchEnd = ref(initialEnd);

const dateRange: Reactive<DateRange> = reactive({
    from: new Date(initialStart),
    to: new Date(initialEnd),
});

const searchString = ref('');

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

const sortedData: Ref<VatsimBooking[]> = computed(sortData);

const bookingTimelineIdentifiers = computed(makeBookingTimlineIdentifiers);

const bookingTimelineEntries = computed(makeBookingTimelineEntries);

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

function makeBookingTimlineIdentifiers() {
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
}

function makeBookingTimelineEntries() {
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
}

function sortData() {
    return (data.value ?? [])
        .filter(x => {
            if (searchString.value.length === 0) return true;
            const lowerSearch = searchString.value.toLowerCase();
            const callsign = x.atc.callsign.toLowerCase();
            return callsign.includes(lowerSearch);
        })
        .sort((a, b) => {
            return b.atc.facility - a.atc.facility;
        }).sort((a, b) => {
            switch (sortMode.value) {
                case 'airport': {
                    const aCountry = a.atc.callsign.split('_')[0] || '';
                    const bCountry = b.atc.callsign.split('_')[0] || '';
                    return aCountry.localeCompare(bCountry);
                }
                case 'date':
                    return a.start - b.start;

                default:
                    return 0;
            }
        });
}

function changeRange(type: 'today' | 'todayTomorrow' | 'today7Days' | 'custom') {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);

    switch (type) {
        case 'today':
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            break;

        case 'todayTomorrow':
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            to.setDate(to.getDate() + 1);
            break;

        case 'today7Days':
            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);
            to.setDate(to.getDate() + 7);
            to.setHours(23, 59, 59, 999);
            break;

        case 'custom': {
            const hours = parseInt(presetHours.value, 10) || 0;
            to.setTime(to.getTime() + (hours * 60 * 60 * 1000));
            break;
        }
    }

    dateRange.from = from;
    dateRange.to = to;
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

    &-presets {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: start;

        width: 100%;
        margin-bottom: 16px;

        &-custom {
            display: flex;
            flex-direction: row;
            gap: 8px;
            align-items: center;
        }
    }

    &-picker {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &-localtime {
        margin-top: 16px;
    }
}

.booking {
    &-sort {
        &-container {
            display: flex;
            flex-direction: row;
            gap: 16px;
            align-items: center;
            justify-content: center;

            margin-top: 32px;
            margin-bottom: 32px;
        }
    }
}
</style>
