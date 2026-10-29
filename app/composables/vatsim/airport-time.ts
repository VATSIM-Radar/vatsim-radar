import tzlookup from '@photostructure/tz-lookup';
import type { MaybeRefOrGetter } from 'vue';
import type { VatSpyAirport } from '~/types/data/vatspy';
import { injectAirport } from '~/composables/vatsim/airport';
import { getLocalNoon, getSunTimes } from '~/utils/shared/sun';

export function useAirportTime(airport?: MaybeRefOrGetter<VatSpyAirport | null | undefined>) {
    const dataStore = useDataStore();
    const data = injectAirport(true);
    const vatAirport = computed(() => {
        const directAirport = airport === undefined ? null : toValue(airport);
        if (directAirport) return directAirport;

        const icao = data?.value.airport?.vatInfo?.icao ?? data?.value.icao;
        if (!icao) return null;
        return dataStore.vatspy.value?.data.keyAirports.realIcao[icao] ?? null;
    });

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

    // Formats as "14:32 (UTC+2)".
    function formatLocalTime(date: Date) {
        const parts = localFormatter.value!.formatToParts(date);
        const time = parts.filter(x => x.type === 'hour' || x.type === 'literal' || x.type === 'minute').map(x => x.value).join('').trim();
        const offset = parts.find(x => x.type === 'timeZoneName')?.value.replace('GMT', 'UTC');

        return `${ time } (${ offset })`;
    }

    const localTime = computed(() => localFormatter.value ? formatLocalTime(now.value) : null);

    // Keep the time values separate so local and UTC can be displayed independently.
    function formatSunTime(date: Date) {
        return {
            utc: utcFormatter.format(date),
            local: localFormatter.value ? formatLocalTime(date).split(' ')[0] : null,
            polar: null,
        };
    }

    const sunTimes = computed(() => {
        if (!vatAirport.value) return null;

        const { lat, lon } = vatAirport.value;
        const { sunrise, sunset, polar } = getSunTimes(getLocalNoon(now.value, lon, timeZone.value), lat, lon);

        if (polar) {
            return {
                sunrise: { utc: null, local: null, polar: polar === 'day' ? 'Polar day' : 'Polar night' },
                sunset: null,
            };
        }

        return {
            sunrise: sunrise && formatSunTime(sunrise),
            sunset: sunset && formatSunTime(sunset),
        };
    });

    return { vatAirport, localTime, sunTimes };
}
