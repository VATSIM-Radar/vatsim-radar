<template>
    <div
        v-if="airportInfo"
        class="__info-sections"
    >
        <ui-data-list
            :grid-columns="1"
            :items="[
                { title: 'Name', text: airportInfo.name },
            ]"
        />
        <ui-data-list
            :grid-columns="3"
            :items="[
                { title: 'ICAO', text: airportInfo.icao },
                { title: 'IATA', text: airportInfo.iata, hide: !airportInfo.iata },
                { title: 'Country', text: airportInfo.country },
                { title: 'City', text: airportInfo.city },
                { title: 'Division', text: airportInfo.division_id },
                { title: 'Elevation', text: `${ airportInfo.altitude_m }m, ${ airportInfo.altitude_ft }ft` },
                { title: 'Transition Level', text: airportInfo.transition_level },
                { title: 'Transition Altitude', text: airportInfo.transition_alt },
                { title: 'CTAF', text: airportInfo.ctafFreq, hide: !airportInfo.ctafFreq },
                { title: 'Magnetic Declination', text: decl, hide: !decl },
                { title: 'Local Time', text: localTime, hide: !localTime },
                { title: 'Sunrise', text: sunTimes?.sunrise, hide: !sunTimes?.sunrise },
                { title: 'Sunset', text: sunTimes?.sunset, hide: !sunTimes?.sunset },
            ]"
        />
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/vatsim/airport';
import UiDataList from '~/components/ui/data/UiDataList.vue';
// @ts-expect-error JS-only lib
import { magvar } from 'magvar';
import tzlookup from '@photostructure/tz-lookup';
import { getSunTimes } from '~/utils/shared/sun';

const dataStore = useDataStore();
const data = injectAirport();

const airportInfo = computed(() => data.value.airport?.vatInfo);
const vatAirport = computed(() => {
    if (!data.value.airport?.vatInfo?.icao) return null;
    return dataStore.vatspy.value?.data.keyAirports.realIcao[data.value.airport?.vatInfo?.icao] ?? null;
});
const decl = computed(() => vatAirport.value ? Math.round(magvar(vatAirport.value.lat, vatAirport.value.lon)) : null);

const now = ref(new Date());
let interval: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
    interval = setInterval(() => now.value = new Date(), 1000 * 10);
});

onBeforeUnmount(() => clearInterval(interval));

const timeZone = computed(() => {
    if (!vatAirport.value) return null;

    try {
        return tzlookup(vatAirport.value.lat, vatAirport.value.lon);
    }
    catch {
        return null;
    }
});

const utcFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const localFormatter = computed(() => {
    if (!timeZone.value) return null;

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZone.value,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'shortOffset',
    });
});

// Formats as "14:32 (UTC+2)"
function formatLocalTime(date: Date) {
    const parts = localFormatter.value!.formatToParts(date);
    const time = parts.filter(x => x.type === 'hour' || x.type === 'literal' || x.type === 'minute').map(x => x.value).join('').trim();
    const offset = parts.find(x => x.type === 'timeZoneName')?.value.replace('GMT', 'UTC');

    return `${ time } (${ offset })`;
}

const localTime = computed(() => localFormatter.value ? formatLocalTime(now.value) : null);

// Formats as "06:41 local, 04:41z", or only zulu time when timezone is unknown
function formatSunTime(date: Date) {
    const utc = `${ utcFormatter.format(date) }z`;
    if (!localFormatter.value) return utc;

    return `${ formatLocalTime(date).split(' ')[0] } local, ${ utc }`;
}

const sunTimes = computed(() => {
    if (!vatAirport.value) return null;

    const { sunrise, sunset, polar } = getSunTimes(now.value, vatAirport.value.lat, vatAirport.value.lon);

    if (polar) {
        return {
            sunrise: polar === 'day' ? 'Polar day' : 'Polar night',
            sunset: null,
        };
    }

    return {
        sunrise: sunrise && formatSunTime(sunrise),
        sunset: sunset && formatSunTime(sunset),
    };
});
</script>
