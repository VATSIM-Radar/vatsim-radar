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
                <label>Arrival interval (minutes)</label>
                <ui-input-number
                    height="28px"
                    :input-attrs="predictionOptionLimits.binSize"
                    :model-value="predictionOptions.binSize"
                    @update:modelValue="updatePredictionOption('binSize', $event)"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Window range (minutes)</label>
                <ui-input-number
                    height="28px"
                    :input-attrs="predictionOptionLimits.windowMinutes"
                    :model-value="predictionOptions.windowMinutes"
                    @update:modelValue="updatePredictionOption('windowMinutes', $event)"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Caution threshold (arrivals)</label>
                <ui-input-number
                    height="28px"
                    :input-attrs="predictionOptionLimits.warningThreshold"
                    :model-value="predictionOptions.warningThreshold"
                    @update:modelValue="updatePredictionOption('warningThreshold', $event)"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Alert threshold (arrivals)</label>
                <ui-input-number
                    height="28px"
                    :input-attrs="predictionOptionLimits.alertThreshold"
                    :model-value="predictionOptions.alertThreshold"
                    @update:modelValue="updatePredictionOption('alertThreshold', $event)"
                />
            </div>
            <div class="predicted-traffic_settings_field">
                <label>Chart Y-axis maximum (0 = automatic)</label>
                <ui-input-number
                    height="28px"
                    :input-attrs="predictionOptionLimits.yMaxOverride"
                    :model-value="predictionOptions.yMaxOverride"
                    @update:modelValue="updatePredictionOption('yMaxOverride', $event)"
                />
            </div>
            <ui-button
                v-if="hasPredictionOverrides"
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
                No airborne arrivals expected in the next {{ predictionOptions.windowMinutes }} minutes.
            </div>
        </div>
        <div class="predicted-traffic_footer">
            <span class="predicted-traffic_footer_window">{{ windowRangeLabel }}</span>
            <span
                v-if="peakBin"
                class="predicted-traffic_footer_peak"
            >
                Peak: <strong>{{ peakBin.count }}</strong> @ {{ peakBin.label }}z
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { Bar as ChartBar } from 'vue-chartjs';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { getAircraftForAirport, injectAirport } from '~/composables/vatsim/airport';
import type { AirportPopupPilotList } from '~/composables/vatsim/airport';
import { useStore } from '~/store';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import SettingsIcon from '~/assets/icons/kit/settings.svg?component';
import { dashboardPredictedDefaults } from '~/utils/shared/dashboard';
import type { DashboardPredictedOptions } from '~/utils/shared/dashboard';

const props = defineProps({
    aircraft: {
        type: Object as PropType<AirportPopupPilotList | null>,
        default: undefined,
    },
    airportAltitudeFt: {
        type: Number,
        default: undefined,
    },
    predictedOptions: {
        type: Object as PropType<Partial<DashboardPredictedOptions> | undefined>,
        default: undefined,
    },
});

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const predictionOptionLimits = {
    binSize: { min: 1, max: 60, step: 1 },
    windowMinutes: { min: 15, max: 480, step: 15 },
    warningThreshold: { min: 1, step: 1 },
    alertThreshold: { min: 1, step: 1 },
    yMaxOverride: { min: 0, step: 1 },
} as const;

type PredictionOptionKey = keyof DashboardPredictedOptions;

const route = useRoute();
const router = useRouter();
const optionQueryKeys: Record<PredictionOptionKey, string> = {
    binSize: 'predictionBin',
    windowMinutes: 'predictionRange',
    warningThreshold: 'predictionCaution',
    alertThreshold: 'predictionAlert',
    yMaxOverride: 'predictionMax',
};
const baseOptions = computed<DashboardPredictedOptions>(() => ({
    ...dashboardPredictedDefaults,
    ...props.predictedOptions,
}));

const predictionOptions = computed<DashboardPredictedOptions>(() => {
    const options = { ...baseOptions.value };

    for (const key of Object.keys(optionQueryKeys) as PredictionOptionKey[]) {
        const limits = predictionOptionLimits[key];
        const queryValue = route.query[optionQueryKeys[key]];
        const value = typeof queryValue === 'string' ? Number(queryValue) : Number.NaN;
        const withinRange = value >= limits.min && (!('max' in limits) || value <= limits.max);
        const matchesStep = !limits.step || (value - limits.min) % limits.step === 0;

        if (Number.isInteger(value) && withinRange && matchesStep) options[key] = value;
    }

    return options;
});

const hasPredictionOverrides = computed(() => Object.values(optionQueryKeys).some(key => key in route.query));

function updatePredictionOption(key: PredictionOptionKey, value: number | null) {
    const query = { ...route.query };
    const queryKey = optionQueryKeys[key];

    if (value === null || value === baseOptions.value[key]) delete query[queryKey];
    else query[queryKey] = String(value);
    router.replace({ query });
}

function resetSettings() {
    const query = { ...route.query };
    for (const queryKey of Object.values(optionQueryKeys)) delete query[queryKey];
    router.replace({ query });
}

const settingsOpen = ref(false);

const store = useStore();
const dataStore = useDataStore();

// Single-airport fallback resolved from injection; the `aircraft` prop (multi-airport dashboard)
// takes precedence when provided. Both are set up unconditionally so props are only read reactively.
const injectedAirport = injectAirport(true);
const ownAircraft = getAircraftForAirport(injectedAirport);
const aircraft = computed<AirportPopupPilotList | null>(() => props.aircraft ?? ownAircraft.value);

const binCount = computed(() => Math.max(1, Math.ceil(predictionOptions.value.windowMinutes / Math.max(1, predictionOptions.value.binSize))));

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const binSizeMs = computed(() => Math.max(1, predictionOptions.value.binSize) * 60_000);

const firstBinStart = computed(() => {
    const now = dataStore.time.value || Date.now();
    return Math.floor(now / binSizeMs.value) * binSizeMs.value;
});

const airportAltitudeFt = computed(() => props.airportAltitudeFt ?? injectedAirport?.value?.airport?.vatInfo?.altitude_ft ?? 0);

function isStillAirborne(arrival: { altitude?: number; groundspeed?: number; distance?: number }) {
    const alt = arrival.altitude ?? 0;
    const gs = arrival.groundspeed ?? 0;
    const dist = arrival.distance ?? 0;

    const aboveAirport = alt > airportAltitudeFt.value + 1000;
    if (aboveAirport) return true;

    return gs > 80 && dist > 3;
}

const airborneArrivals = computed(() => {
    return aircraft.value?.arrivals?.filter(isStillAirborne) ?? [];
});

const arrivalBins = computed(() => {
    const bins: number[] = Array(binCount.value).fill(0);
    if (!airborneArrivals.value.length) return bins;

    const startMs = firstBinStart.value;
    const sizeMs = binSizeMs.value;

    for (const arrival of airborneArrivals.value) {
        if (!arrival.eta) continue;
        const offsetMs = arrival.eta.getTime() - startMs;
        if (offsetMs < 0) continue;
        const idx = Math.floor(offsetMs / sizeMs);
        if (idx >= bins.length) continue;
        bins[idx] += 1;
    }
    return bins;
});

const labels = computed(() => {
    return Array.from({ length: binCount.value }, (_, i) => {
        const start = new Date(firstBinStart.value + (i * binSizeMs.value));
        return timeFormatter.format(start);
    });
});

const counts = computed(() => arrivalBins.value);

const totalArrivals = computed(() => counts.value.reduce((acc, n) => acc + n, 0));

const peakBin = computed(() => {
    let maxIdx = -1;
    let maxVal = 0;
    counts.value.forEach((v, i) => {
        if (v > maxVal) {
            maxVal = v;
            maxIdx = i;
        }
    });
    if (maxIdx < 0) return null;
    return { count: maxVal, label: labels.value[maxIdx] };
});

const windowRangeLabel = computed(() => {
    const start = new Date(firstBinStart.value);
    const end = new Date(firstBinStart.value + (binCount.value * binSizeMs.value));
    return `${ timeFormatter.format(start) }z – ${ timeFormatter.format(end) }z`;
});

function getBarColor(count: number): string {
    if (count >= predictionOptions.value.alertThreshold) return getCurrentThemeHexColor('red500');
    if (count >= predictionOptions.value.warningThreshold) return getCurrentThemeHexColor('citrus500');
    return getCurrentThemeHexColor('green500');
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
    const suggestedMax = predictionOptions.value.yMaxOverride > 0
        ? predictionOptions.value.yMaxOverride
        : Math.max(maxCount, predictionOptions.value.alertThreshold);

    const size = predictionOptions.value.binSize;
    const startMs = firstBinStart.value;
    const sizeMs = binSizeMs.value;

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items: Array<{ dataIndex: number }>) => {
                        const i = items[0]?.dataIndex ?? 0;
                        const from = timeFormatter.format(new Date(startMs + (i * sizeMs)));
                        const to = timeFormatter.format(new Date(startMs + ((i + 1) * sizeMs)));
                        return `${ from }z – ${ to }z (${ size } min)`;
                    },
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

    &_footer {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        font-size: 11px;
        color: $lightGray600;

        &_window {
            opacity: 0.8;
        }

        &_peak {
            color: $lightGray500;
        }
    }
}
</style>
