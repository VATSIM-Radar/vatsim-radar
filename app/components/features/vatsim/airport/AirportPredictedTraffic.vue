<template>
    <div class="predicted-traffic">
        <div class="predicted-traffic_header">
            <div class="predicted-traffic_header_title">
                <span class="predicted-traffic_header_title_text">Predicted Traffic</span>
                <ui-bubble class="predicted-traffic_header_title_bubble">
                    {{ totalArrivals }}
                </ui-bubble>
            </div>
            <div class="predicted-traffic_header_actions">
                <ui-button
                    icon-width="14px"
                    title="Settings"
                    type="link"
                    @click="settingsOpen = !settingsOpen"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </ui-button>
            </div>
        </div>
        <div
            v-if="settingsOpen"
            class="predicted-traffic_settings"
        >
            <div class="predicted-traffic_settings_field">
                <label>Bin size (min)</label>
                <ui-input-number
                    v-model="binSize"
                    height="28px"
                    :input-attrs="{ min: 1, max: 60, step: 1 }"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Window (min)</label>
                <ui-input-number
                    v-model="windowMinutes"
                    height="28px"
                    :input-attrs="{ min: 15, max: 480, step: 15 }"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Warning (orange)</label>
                <ui-input-number
                    v-model="warningThreshold"
                    height="28px"
                    :input-attrs="{ min: 1, step: 1 }"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Alert (red)</label>
                <ui-input-number
                    v-model="alertThreshold"
                    height="28px"
                    :input-attrs="{ min: 1, step: 1 }"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Y-axis max (0 = auto)</label>
                <ui-input-number
                    v-model="yMaxOverride"
                    height="28px"
                    :input-attrs="{ min: 0, step: 1 }"
                />
            </div>
            <ui-button
                size="S"
                type="secondary"
                @click="resetSettings"
            >
                Reset
            </ui-button>
        </div>
        <div
            :key="`${ store.viewport.width }-${ store.theme }`"
            class="predicted-traffic_chart"
        >
            <chart-bar
                v-if="chartData && totalArrivals > 0"
                :data="chartData"
                :options="chartOptions"
            />
            <div
                v-else
                class="predicted-traffic_chart_empty"
            >
                No arrivals with ETA in the next {{ windowMinutes }} minutes.
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Bar as ChartBar } from 'vue-chartjs';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { getAircraftForAirport, injectAirport } from '~/composables/vatsim/airport';
import { useStore } from '~/store';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import SettingsIcon from '~/assets/icons/kit/settings.svg?component';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const defaultSettings = {
    binSize: 10,
    windowMinutes: 120,
    warningThreshold: 5,
    alertThreshold: 10,
    yMaxOverride: 0,
};

const binSize = useCookie<number>('predicted-traffic-bin-size', {
    sameSite: 'none',
    secure: true,
    path: '/',
    default: () => defaultSettings.binSize,
});

const windowMinutes = useCookie<number>('predicted-traffic-window', {
    sameSite: 'none',
    secure: true,
    path: '/',
    default: () => defaultSettings.windowMinutes,
});

const warningThreshold = useCookie<number>('predicted-traffic-warning', {
    sameSite: 'none',
    secure: true,
    path: '/',
    default: () => defaultSettings.warningThreshold,
});

const alertThreshold = useCookie<number>('predicted-traffic-alert', {
    sameSite: 'none',
    secure: true,
    path: '/',
    default: () => defaultSettings.alertThreshold,
});

const yMaxOverride = useCookie<number>('predicted-traffic-ymax', {
    sameSite: 'none',
    secure: true,
    path: '/',
    default: () => defaultSettings.yMaxOverride,
});

function resetSettings() {
    binSize.value = defaultSettings.binSize;
    windowMinutes.value = defaultSettings.windowMinutes;
    warningThreshold.value = defaultSettings.warningThreshold;
    alertThreshold.value = defaultSettings.alertThreshold;
    yMaxOverride.value = defaultSettings.yMaxOverride;
}

const settingsOpen = ref(false);

const store = useStore();
const airportData = injectAirport();
const aircraft = getAircraftForAirport(airportData);

const binCount = computed(() => Math.max(1, Math.ceil(windowMinutes.value / Math.max(1, binSize.value))));

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const dataStore = useDataStore();

const arrivalBins = computed(() => {
    const bins: number[] = Array(binCount.value).fill(0);
    const arrivals = aircraft.value?.arrivals;
    if (!arrivals?.length) return bins;

    const now = dataStore.time.value || Date.now();
    const size = Math.max(1, binSize.value);

    for (const arrival of arrivals) {
        if (!arrival.eta) continue;
        const diffMinutes = (arrival.eta.getTime() - now) / 60_000;
        if (diffMinutes < 0) continue;
        const idx = Math.floor(diffMinutes / size);
        if (idx >= bins.length) continue;
        bins[idx] += 1;
    }
    return bins;
});

const labels = computed(() => {
    const now = dataStore.time.value || Date.now();
    return Array.from({ length: binCount.value }, (_, i) => {
        const start = new Date(now + (i * binSize.value * 60_000));
        return timeFormatter.format(start);
    });
});

const counts = computed(() => arrivalBins.value);

const totalArrivals = computed(() => counts.value.reduce((acc, n) => acc + n, 0));

function getBarColor(count: number): string {
    if (count >= alertThreshold.value) return getCurrentThemeHexColor('error500');
    if (count >= warningThreshold.value) return getCurrentThemeHexColor('warning500');
    return getCurrentThemeHexColor('success500');
}

const gridColor = computed(() => getCurrentThemeHexColor('darkGray500'));
const axisLabelColor = computed(() => getCurrentThemeHexColor('lightGray500'));

const chartData = computed(() => ({
    labels: labels.value,
    datasets: [
        {
            label: 'Arrivals',
            data: counts.value,
            backgroundColor: counts.value.map(getBarColor),
            borderColor: counts.value.map(getBarColor),
            borderWidth: 1,
            borderRadius: 2,
            categoryPercentage: 1,
            barPercentage: 0.95,
        },
    ],
}));

const chartOptions = computed<Record<string, any>>(() => {
    const maxCount = Math.max(0, ...counts.value);
    const suggestedMax = yMaxOverride.value > 0
        ? yMaxOverride.value
        : Math.max(maxCount, alertThreshold.value);

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items: Array<{ label: string }>) => `From ${ items[0]?.label }z`,
                    label: (item: { parsed: { y: number } }) => `Arrivals: ${ item.parsed.y }`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: gridColor.value, display: false },
                ticks: {
                    color: axisLabelColor.value,
                    autoSkip: true,
                    maxRotation: 0,
                    font: { size: 10 },
                },
            },
            y: {
                beginAtZero: true,
                suggestedMax,
                grid: { color: gridColor.value },
                ticks: {
                    color: axisLabelColor.value,
                    stepSize: 1,
                    precision: 0,
                    font: { size: 10 },
                },
            },
        },
    };
});
</script>

<style scoped lang="scss">
.predicted-traffic {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &_title {
            display: flex;
            gap: 8px;
            align-items: center;

            font-size: 14px;
            font-weight: 600;
            color: $lightGray500;

            &_text {
                line-height: 100%;
            }
        }

        &_actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
    }

    &_settings {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        align-items: center;

        padding: 8px;
        border: 1px solid $strokeDefault;
        border-radius: 8px;

        background: $darkGray800;

        &_field {
            display: flex;
            flex-direction: column;
            gap: 4px;

            font-size: 11px;
            color: $lightGray600;

            label {
                opacity: 0.8;
            }
        }
    }

    &_chart {
        position: relative;
        min-height: 180px;

        &_empty {
            display: flex;
            align-items: center;
            justify-content: center;

            min-height: 180px;
            padding: 16px;
            border: 1px dashed $strokeDefault;
            border-radius: 8px;

            font-size: 12px;
            color: $lightGray600;
            text-align: center;

            opacity: 0.7;
        }
    }
}
</style>
