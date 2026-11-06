import type { MaybeRefOrGetter } from 'vue';
import { parseMetar } from 'metar-taf-parser';
import type { IMetar, IMetarDated } from 'metar-taf-parser';
import { useDataStore } from '~/composables/render/storage';
import { getActiveRunways } from '~/utils/shared/runway-detection';
import {
    getMagneticVariation,
    getRunwayDesignator,
    getRunwayWind,
    getWindFavouredRunways,
    isWindRunway,
} from '~/utils/shared/awos';
import type { AwosRunway, RunwayWind } from '~/utils/shared/awos';
import type { NavigraphRunway } from '~/types/data/navigraph';

export interface AirportAtisInfo {
    /** Combined letter, or "D/A" when separate departure/arrival ATIS are online */
    letter: string | null;
    departure: string[];
    arrival: string[];
}

const isDepartureAtis = (callsign: string) => callsign.endsWith('_D_ATIS');
const isArrivalAtis = (callsign: string) => callsign.endsWith('_A_ATIS');

function getAirportAtisList(icao: string) {
    return useDataStore().vatsim.data.atis.value.filter(atis => atis.callsign.startsWith(`${ icao }_`) && atis.callsign.endsWith('ATIS'));
}

/**
 * Current ATIS letter: the combined ATIS letter, or "D/A" when separate departure/arrival ATIS are online.
 * Only stations that broadcast a code count. Used on its own by the dashboard weather strip, which needs no runway parsing
 */
export function getAirportAtisLetter(icao: string, atisList = getAirportAtisList(icao)): string | null {
    const coded = atisList.filter(atis => atis.atis_code);
    const combined = coded.find(atis => !isDepartureAtis(atis.callsign) && !isArrivalAtis(atis.callsign))?.atis_code;
    if (combined) return combined;

    const parts = [
        coded.find(atis => isDepartureAtis(atis.callsign))?.atis_code,
        coded.find(atis => isArrivalAtis(atis.callsign))?.atis_code,
    ].filter(Boolean);

    return parts.length ? parts.join('/') : null;
}

/**
 * Reads the live ATIS stations of an airport directly from the VATSIM feed.
 * Runways come from the same parser as the map (getActiveRunways()): a combined ATIS wins, otherwise departure runways are
 * read from the departure ATIS only and arrival runways from the arrival ATIS only. Unlike the map, a departure (or arrival)
 * ATIS is never used to guess the other side when only one of them is online.
 */
export function getAirportAtisInfo(icao: string): AirportAtisInfo {
    const atisList = getAirportAtisList(icao);
    const letter = getAirportAtisLetter(icao, atisList);

    const combinedAtis = atisList.find(atis => !isDepartureAtis(atis.callsign) && !isArrivalAtis(atis.callsign));
    if (combinedAtis?.text_atis?.length) {
        return { letter, ...getActiveRunways(combinedAtis.text_atis) };
    }

    const departureAtis = atisList.find(atis => isDepartureAtis(atis.callsign));
    const arrivalAtis = atisList.find(atis => isArrivalAtis(atis.callsign));

    return {
        letter,
        departure: departureAtis?.text_atis?.length ? getActiveRunways(departureAtis.text_atis).departure : [],
        arrival: arrivalAtis?.text_atis?.length ? getActiveRunways(arrivalAtis.text_atis).arrival : [],
    };
}

// Runway data only changes with AIRAC cycles, so one request per airport per session is enough
const runwaysCache = new Map<string, Promise<AwosRunway[]>>();

function toAwosRunway(runway: NavigraphRunway): AwosRunway {
    return {
        ident: getRunwayDesignator(runway.runway_identifier),
        trueBearing: runway.runway_true_bearing,
        magneticBearing: runway.runway_magnetic_bearing,
        elevation: runway.landing_threshold_elevation,
        length: runway.runway_length,
    };
}

export function fetchAwosRunways(icao: string): Promise<AwosRunway[]> {
    let request = runwaysCache.get(icao);

    if (!request) {
        request = $fetch<Record<string, NavigraphRunway[]>>('/api/data/navigraph/runways', { query: { airports: icao } })
            .then(result => (result?.[icao] ?? [])
                .map(toAwosRunway)
                .filter(runway => isWindRunway(runway.ident) && Number.isFinite(runway.trueBearing)))
            .catch(error => {
                console.error(error);
                // Do not keep failed lookups so the next refresh can retry
                runwaysCache.delete(icao);
                return [];
            });

        runwaysCache.set(icao, request);
    }

    return request;
}

export interface AwosRunwayRow extends AwosRunway {
    wind: RunwayWind | null;
    favoured: boolean;
    atisDeparture: boolean;
    atisArrival: boolean;
}

/** Runway end drawn on the AWOS wind dial */
export interface AwosDialRunway {
    ident: string;
    magneticBearing: number;
    /** Wind-favoured end */
    favoured: boolean;
    /** Announced on the ATIS */
    active: boolean;
}

/**
 * Parses a METAR with its full observation date: the parser resolves the "DDHHMMZ" group to the closest matching date,
 * which also handles reports from the last day of the previous month
 */
function parseAwosMetar(metar: string | null | undefined): IMetarDated | null {
    if (!metar) return null;

    try {
        return parseMetar(metar, { issued: new Date() });
    }
    catch {
        return null;
    }
}

// Manual runway choice, keyed by ICAO. Missing/empty = follow the wind-favoured runways.
// Kept in memory only, so a page reload always goes back to the automatic (wind-favoured) runways.
// Only ever written from client-side user actions, so sharing it at module level is safe during SSR
const manualRunways = ref<Record<string, string[]>>({});

export interface AwosQnhChange {
    /** QNH the change is measured from (the last value before the first unacknowledged change), in its own unit */
    previous: NonNullable<IMetar['altimeter']>;
    /** Cleared by the user once the change has been passed on */
    acknowledged: boolean;
}

// Last QNH seen per ICAO and the pending change alerts. Kept in memory for the session and only written on the client
const lastQnh = new Map<string, NonNullable<IMetar['altimeter']>>();
const qnhChanges = ref<Record<string, AwosQnhChange>>({});

export function useAirportAwos(icaoRef: MaybeRefOrGetter<string | null>, metarRef: MaybeRefOrGetter<string | null | undefined>) {
    const runways = shallowRef<AwosRunway[]>([]);
    const runwaysLoading = ref(false);

    watch(() => toValue(icaoRef), async icao => {
        runways.value = [];
        if (!icao) {
            runwaysLoading.value = false;
            return;
        }

        runwaysLoading.value = true;
        const result = await fetchAwosRunways(icao);
        // Ignore a late response for an airport that is no longer selected
        if (toValue(icaoRef) !== icao) return;
        runways.value = result;
        runwaysLoading.value = false;
    }, { immediate: true });

    const metar = computed(() => parseAwosMetar(toValue(metarRef)));
    // Without a time group the parser falls back to "now", which would wrongly look like a fresh report
    const observedAt = computed(() => (typeof metar.value?.day === 'number' && typeof metar.value.hour === 'number' ? metar.value.issued : null));
    const atis = computed<AirportAtisInfo>(() => {
        const icao = toValue(icaoRef);
        return icao ? getAirportAtisInfo(icao) : { letter: null, departure: [], arrival: [] };
    });

    /*
     * QNH change alert: when a new METAR for the same airport brings a different QNH, remember the old value
     * until the user acknowledges it. The first METAR seen for an airport only becomes the reference.
     */
    watch(() => [toValue(icaoRef), metar.value?.altimeter?.value, metar.value?.altimeter?.unit] as const, ([icao]) => {
        if (import.meta.server || !icao) return;
        const altimeter = metar.value?.altimeter;
        if (!altimeter) return;

        const last = lastQnh.get(icao);
        lastQnh.set(icao, { ...altimeter });

        // A unit change means a different reporting format, not a pressure change
        if (!last || last.unit !== altimeter.unit || last.value === altimeter.value) return;

        // Several changes in a row without acknowledgement keep the value the controller last acknowledged,
        // so 1019 -> 1020 -> 1021 shows "was 1019", and going back to 1019 clears the alert
        const pending = qnhChanges.value[icao];
        const reference = pending && !pending.acknowledged && pending.previous.unit === altimeter.unit ? pending.previous : last;

        const next = { ...qnhChanges.value };
        if (reference.value === altimeter.value) delete next[icao];
        else next[icao] = { previous: reference, acknowledged: false };
        qnhChanges.value = next;
    }, { immediate: true });

    /** Unacknowledged QNH change of the current airport, null when there is none */
    const qnhChange = computed(() => {
        const change = qnhChanges.value[toValue(icaoRef) ?? ''];
        return change && !change.acknowledged ? change : null;
    });

    function acknowledgeQnh() {
        const icao = toValue(icaoRef);
        if (!icao || !qnhChanges.value[icao]) return;
        qnhChanges.value = { ...qnhChanges.value, [icao]: { ...qnhChanges.value[icao], acknowledged: true } };
    }

    const variation = computed(() => getMagneticVariation(runways.value));
    const favoured = computed(() => getWindFavouredRunways(metar.value?.wind, runways.value));
    /** Aerodrome elevation approximated by the highest runway threshold */
    const elevation = computed(() => (runways.value.length ? Math.max(...runways.value.map(runway => runway.elevation)) : null));

    const isManual = computed(() => !!manualRunways.value[toValue(icaoRef) ?? '']?.length);

    /**
     * Runways shown in the AWOS table.
     * Manual choice > automatic: the wind-favoured runways plus every ATIS departure/arrival runway, so a runway in use
     * against the wind (e.g. ATIS on 27L/27R while the wind favours 09L/09R) is still shown > all runways when the wind
     * favours none (calm/VRB/direct crosswind/no METAR) and no ATIS runway is known.
     */
    const selectedRunways = computed<string[]>({
        get: () => {
            const known = new Set(runways.value.map(runway => runway.ident));
            const manual = manualRunways.value[toValue(icaoRef) ?? '']?.filter(ident => known.has(ident));
            if (manual?.length) return manual;

            const atisRunways = [...atis.value.departure, ...atis.value.arrival].filter(ident => known.has(ident));
            const automatic = [...new Set([...favoured.value, ...atisRunways])];
            if (automatic.length) return automatic;

            return [...known];
        },
        set: value => {
            const icao = toValue(icaoRef);
            if (!icao) return;

            const next = { ...manualRunways.value };
            if (value.length) next[icao] = value;
            else delete next[icao];
            manualRunways.value = next;
        },
    });

    function resetRunways() {
        selectedRunways.value = [];
    }

    const rows = computed<AwosRunwayRow[]>(() => {
        const selected = new Set(selectedRunways.value);
        const favouredSet = new Set(favoured.value);

        return runways.value
            .filter(runway => selected.has(runway.ident))
            .map(runway => ({
                ...runway,
                wind: getRunwayWind(metar.value?.wind, runway),
                favoured: favouredSet.has(runway.ident),
                atisDeparture: atis.value.departure.includes(runway.ident),
                atisArrival: atis.value.arrival.includes(runway.ident),
            }));
    });

    return {
        metar,
        observedAt,
        atis,
        runways,
        runwaysLoading,
        variation,
        favoured,
        elevation,
        selectedRunways,
        isManual,
        resetRunways,
        rows,
        qnhChange,
        acknowledgeQnh,
    };
}
