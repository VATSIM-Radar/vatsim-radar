<template>
    <div class="flight-graph">
        <chart-line
            v-if="data"
            :data
            :options
        />
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import { useStore } from '~/store';
import type { InfluxGeojson } from '~/utils/backend/influx/converters';
import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    LinearScale,
    CategoryScale,
    PointElement,
    LineElement,
} from 'chart.js';
import { Line as ChartLine } from 'vue-chartjs';

const props = defineProps({
    pilot: {
        type: Object as PropType<VatsimExtendedPilot>,
        required: true,
    },
});

ChartJS.register(CategoryScale, PointElement, LineElement, LinearScale, Tooltip, Legend);

const { data: tracks, refresh } = await useAsyncData(computed(() => `${ props.pilot.cid }-graph`), () => $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ props.pilot.cid }/turns`, {
    timeout: 1000 * 5,
}).catch(console.error));

const dataStore = useDataStore();
const store = useStore();

const formatter = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
}));

const data = computed(() => {
    if (!tracks.value) return null;

    const data = tracks.value.features?.flatMap(x => x.features.filter(x => x.properties.timestamp && 'altitude' in x.properties).map(x => ({
        label: formatter.value.format(new Date(x.properties.timestamp ?? new Date(dataStore.time.value).toISOString())),
        altitude: x.properties.altitude ?? 0,
        speed: x.properties.speed ?? 0,
    }))).reverse() ?? [];

    return {
        labels: data.map(x => x.label),
        datasets: [
            {
                label: 'Altitude',
                data: data.map(x => x.altitude),
                borderColor: getCurrentThemeHexColor('primary500'),
                backgroundColor: `rgba(${ getCurrentThemeRgbColor('primary500') }, 0.5)`,
                yAxisID: 'y',
            },
            {
                label: 'Speed',
                data: data.map(x => x.speed),
                borderColor: getCurrentThemeHexColor('warning500'),
                backgroundColor: `rgba(${ getCurrentThemeRgbColor('warning500') }, 0.5)`,
                yAxisID: 'y1',
            },
        ],
    };
});

const options: Record<string, any> = {
    responsive: true,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            display: false,
        },
    },
    elements: {
        point: {
            radius: 0, // скрыть точки
        },
    },
    stacked: false,
    scales: {
        y: {
            type: 'linear',
            display: true,
            position: 'left',
        },
        y1: {
            type: 'linear',
            display: true,
            position: 'right',

            // grid line settings
            grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
        },
    },
};

useUpdateInterval(refresh, 60 * 1000);
</script>
