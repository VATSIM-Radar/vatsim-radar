<template>
    <div class="stats-table __vertical-group-16">
        <div
            class="stats-table_controls"
            :class="{ 'stats-table_controls--exact': to && from }"
        >
            <ui-radio-group
                v-model="date"
                class="stats-table_controls_radio"
                :items="dateOptions"
            />
            <div class="stats-table_controls_dates">
                <ui-input-text
                    input-type="date"
                    :model-value="fromInput"
                    width="auto"
                    @update:modelValue="from = parseDate($event)"
                >From (UTC)</ui-input-text>
                <ui-input-text
                    input-type="date"
                    :model-value="toInput"
                    width="auto"
                    @update:modelValue="to = parseDate($event)"
                >To (UTC)</ui-input-text>
                <ui-button
                    :disabled="!from && !to"
                    @click="clearDates"
                >Clear dates</ui-button>
            </div>
            <ui-text
                v-if="rangeError"
                color="red500"
                type="2b"
            >{{ rangeError }}</ui-text>
        </div>
        <ui-notification v-if="loading" type="warning">
            {{ loadingText }}
        </ui-notification>
        <ui-notification v-else type="info">
            Historical stats is provided by <a
                class="__link"
                href="https://statsim.net"
                target="_blank"
            >StatSim</a>
        </ui-notification>
        <div class="stats-table_content"><slot/></div>
    </div>
</template>

<script setup lang="ts">
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { isValidDate } from '~/utils/shared';
import { isStatsRangeWithin31Days } from '~/utils/shared/stats-range';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import type { StatsRange } from '~/types/data/stats';

const props = defineProps<{ loading?: boolean }>();

const emit = defineEmits<{ range: (range: StatsRange | null) => any }>();
defineSlots<{ default: () => any }>();

const loadingTexts = [
    'Updating data...',
    'Calculating...',
    'Measuring reality...',
    'Compiling atoms...',
    'Did you know? A320 needs 2 wings in order to take off...',
    `Please don't do radio checks unless you actually need it...`,
    'Still processing your stats...',
    `Hang tight - I'm doing my best to load...`,
    `Why do AI apps always do those loading text? They look just stupid aren't they...`,
    `And don't forget, this liner is in the top 1% of all liners out there!`,
];
const loadingText = ref(loadingTexts[0]);

watch(() => props.loading, val => {
    loadingText.value = loadingTexts[0];

    if (!val) return;

    const interval = setInterval(() => {
        loadingText.value = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
        if (!props.loading) clearInterval(interval);
    }, 2500);
});

type StatsDate = 'live' | 'today' | 'week' | 'lastWeek' | 'month' | `month-${ string }`;

const date = ref<StatsDate>('live');
const from = ref<null | Date>(null);
const to = ref<null | Date>(null);
const route = useRoute();
const router = useRouter();
const rangeError = ref<string | null>(null);
const fromInput = computed(() => from.value?.toISOString().slice(0, 10) ?? '');
const toInput = computed(() => to.value?.toISOString().slice(0, 10) ?? '');
const monthsNow = new Date();
const previousMonths = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(monthsNow.getUTCFullYear(), monthsNow.getUTCMonth() - index - 1, 1));
    return {
        value: `month-${ month.toISOString().slice(0, 7) }` as StatsDate,
        text: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month),
    };
});
const dateOptions = [
    { value: 'live', text: 'Live' },
    { value: 'today', text: 'Today' },
    { value: 'week', text: 'This week' },
    { value: 'lastWeek', text: 'Last Week' },
    { value: 'month', text: 'This month' },
    ...previousMonths,
];

function parseDate(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const result = new Date(`${ value }T00:00:00.000Z`);
    return isValidDate(result) && result.toISOString().slice(0, 10) === value ? result : null;
}

function clearDates() {
    from.value = null;
    to.value = null;
}

function getPresetRange(period: StatsDate): { from: Date; to: Date } | null {
    if (period === 'live') return null;

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);

    if (period === 'week' || period === 'lastWeek') {
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
        if (period === 'lastWeek') start.setUTCDate(start.getUTCDate() - 7);
        end.setTime(start.getTime());
        end.setUTCDate(end.getUTCDate() + 7);
    }
    else if (period === 'month' || period.startsWith('month-')) {
        start.setUTCDate(1);
        if (period.startsWith('month-')) {
            const [year, month] = period.slice(6).split('-').map(Number);
            start.setUTCFullYear(year, month - 1, 1);
        }
        end.setTime(start.getTime());
        end.setUTCMonth(end.getUTCMonth() + 1);
    }
    else {
        end.setUTCDate(end.getUTCDate() + 1);
    }

    return { from: start, to: end };
}

function updateRange() {
    // The selected end day is inclusive; the API range ends at the next UTC midnight.
    const customEnd = to.value ? new Date(to.value) : null;
    customEnd?.setUTCDate(customEnd.getUTCDate() + 1);
    const range = from.value && customEnd
        ? { from: from.value, to: customEnd }
        : getPresetRange(date.value);
    rangeError.value = range && !isStatsRangeWithin31Days(range.from, range.to)
        ? 'Select a date range of no more than 31 days (UTC).'
        : null;
    if (!range || rangeError.value) {
        emit('range', null);
        return;
    }
    emit('range', range);
}

onMounted(() => {
    const selectedDate = route.query.date_type ?? route.query.date;
    date.value = selectedDate === 'lastMonth' ? previousMonths[0]?.value ?? 'live' : typeof selectedDate === 'string' && dateOptions.some(x => x.value === selectedDate) ? selectedDate as StatsDate : 'live';
    from.value = typeof route.query.from === 'string' ? parseDate(route.query.from.slice(0, 10)) : null;
    to.value = typeof route.query.to === 'string' ? parseDate(route.query.to.slice(0, 10)) : null;

    watch([date, from, to], () => {
        updateRange();
        void router.replace({
            query: {
                ...route.query,
                date: undefined,
                date_type: date.value === 'live' ? undefined : date.value,
                from: from.value?.toISOString(),
                to: to.value?.toISOString(),
            },
        });
    }, {
        immediate: true,
    });

    watch(() => route.path, () => {
        date.value = 'live';
        to.value = null;
        from.value = null;
    });
});
</script>

<style scoped lang="scss">
.stats-table {
    &_controls {
        &_dates {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: end;

            margin-top: 12px;
        }

        & &_radio {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 16px;

            :deep(.radio_text) {
                margin-left: 8px;
            }
        }

        &--exact .stats-table_controls_radio {
            pointer-events: none;
            opacity: 0.5;
        }
    }
}
</style>
