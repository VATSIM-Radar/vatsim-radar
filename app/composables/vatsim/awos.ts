import { getCurrentInstance } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { parseMetar } from 'metar-taf-parser';
import type { IMetar, IMetarDated } from 'metar-taf-parser';
// @ts-expect-error JS-only lib
import { magvar } from 'magvar';
import { useDataStore } from '~/composables/render/storage';
import { getActiveRunways } from '~/utils/shared/runway-detection';
import {
    getRunwayDesignator,
    getRunwayWind,
    getRunwayWindLimits,
    getWindFavouredRunways,
    isWindRunway,
} from '~/utils/shared/awos';
import type { AwosRunway, RunwayWind, RunwayWindLimits } from '~/utils/shared/awos';
import type { NavigraphRunway } from '~/types/data/navigraph';
import type { VatsimShortenedController } from '~/types/data/vatsim';

export interface AirportAtisStations {
    /** Combined ATIS, e.g. EGLL_ATIS */
    combined?: VatsimShortenedController;
    /** Departure ATIS, e.g. EGLL_D_ATIS */
    departure?: VatsimShortenedController;
    /** Arrival ATIS, e.g. EGLL_A_ATIS */
    arrival?: VatsimShortenedController;
}

export interface AirportAtisRunways {
    departure: string[];
    arrival: string[];
}

/**
 * @description Live ATIS stations grouped by airport ICAO (the callsign prefix). It only recalculates when the VATSIM
 * ATIS list changes, so looking up an airport is a plain object read
 */
export const airportsAtis = computed(() => {
    const airports: Record<string, AirportAtisStations> = {};

    for (const atis of useDataStore().vatsim.data.atis.value) {
        if (!atis.callsign.endsWith('ATIS')) continue;

        const stations = airports[atis.callsign.split('_')[0]] ??= {};
        if (atis.callsign.endsWith('_D_ATIS')) stations.departure ??= atis;
        else if (atis.callsign.endsWith('_A_ATIS')) stations.arrival ??= atis;
        else stations.combined ??= atis;
    }

    return airports;
});

/**
 * @description Current ATIS letter of an airport: the combined ATIS letter, or "D/A" when separate departure/arrival
 * ATIS are online. Only stations that broadcast a code count
 */
export function getAirportAtisLetter(icao: string): string | null {
    const stations = airportsAtis.value[icao];
    if (!stations) return null;
    if (stations.combined?.atis_code) return stations.combined.atis_code;

    const parts = [stations.departure?.atis_code, stations.arrival?.atis_code].filter(Boolean);
    return parts.length ? parts.join('/') : null;
}

/**
 * @description Departure and arrival runways announced on the ATIS of an airport, read with the map's ATIS parser
 * (getActiveRunways()). A combined ATIS wins; otherwise departure runways only come from the departure ATIS and arrival
 * runways only from the arrival ATIS. Unlike the map, one of them is never used to guess the other side.
 */
export function getAirportAtisRunways(icao: string): AirportAtisRunways {
    const stations = airportsAtis.value[icao];
    if (stations?.combined?.text_atis?.length) return getActiveRunways(stations.combined.text_atis);

    return {
        departure: stations?.departure?.text_atis?.length ? getActiveRunways(stations.departure.text_atis).departure : [],
        arrival: stations?.arrival?.text_atis?.length ? getActiveRunways(stations.arrival.text_atis).arrival : [],
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

/**
 * @description Runways of an airport that can get wind components (no helipads), from /api/data/navigraph/runways.
 * Cached per ICAO for the session; failed requests are not cached so they can be retried
 */
export function fetchAwosRunways(icao: string): Promise<AwosRunway[]> {
    let request = runwaysCache.get(icao);

    if (!request) {
        request = $fetch<Record<string, NavigraphRunway[]>>('/api/data/navigraph/runways', { query: { airports: icao } })
            .then(result => (result?.[icao] ?? [])
                .map(toAwosRunway)
                .filter(runway => isWindRunway(runway.ident) && Number.isFinite(runway.trueBearing)))
            .catch(error => {
                console.error(error);
                runwaysCache.delete(icao);
                return [];
            });

        runwaysCache.set(icao, request);
    }

    return request;
}

/** Wind and status of one shown runway end: one row of the AWOS runway table and one runway on the wind dial */
export interface AwosRunwayWind extends AwosRunway {
    wind: RunwayWind | null;
    /** Values above the ICAO runway selection limits */
    limits: RunwayWindLimits;
    /** Favoured by the current wind */
    favoured: boolean;
    /** Announced as departure runway on the ATIS */
    atisDeparture: boolean;
    /** Announced as arrival runway on the ATIS */
    atisArrival: boolean;
}

export interface AwosQnhChange {
    /** QNH the change is measured from (the last value before the first unacknowledged change), in its own unit */
    previous: NonNullable<IMetar['altimeter']>;
    /** Cleared by the user once the change has been passed on */
    acknowledged: boolean;
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

// Manual runway choice, keyed by ICAO. Missing/empty = automatic runways.
// Kept in memory only, so a page reload always goes back to the automatic runways.
// Only ever written from client-side user actions, so sharing it at module level is safe during SSR
const manualRunways = ref<Record<string, string[]>>({});

// Last QNH seen per ICAO and the pending change alerts. Kept in memory for the session and only written on the client
const lastQnh = new Map<string, NonNullable<IMetar['altimeter']>>();
const qnhChanges = ref<Record<string, AwosQnhChange>>({});

/**
 * AWOS data of one airport: parsed METAR, ATIS, runways with their wind components and the QNH change alert.
 * Returns a reactive object, so use it without destructuring: const awos = useAirportAwos(...); awos.runways.winds
 */
export function useAirportAwos(icaoRef: MaybeRefOrGetter<string | null>, metarRef: MaybeRefOrGetter<string | null | undefined>) {
    if (!getCurrentInstance()) throw new Error('useAirportAwos can only be used in a component setup');

    const dataStore = useDataStore();
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

    const atis = computed(() => {
        const icao = toValue(icaoRef);
        return {
            letter: icao ? getAirportAtisLetter(icao) : null,
            ...(icao ? getAirportAtisRunways(icao) : { departure: [], arrival: [] }),
        };
    });

    /** Magnetic variation at the airport (true - magnetic, east positive), null when the airport position is unknown */
    const magneticVariation = computed<number | null>(() => {
        const icao = toValue(icaoRef);
        const airport = icao ? dataStore.vatspy.value?.data.keyAirports.realIcao[icao] : null;
        return airport ? magvar(airport.lat, airport.lon) : null;
    });

    /** Aerodrome elevation in feet, approximated by the highest runway threshold */
    const elevation = computed(() => (runways.value.length ? Math.max(...runways.value.map(runway => runway.elevation)) : null));

    const favouredRunways = computed(() => getWindFavouredRunways(metar.value?.wind, runways.value));
    const isManual = computed(() => !!manualRunways.value[toValue(icaoRef) ?? '']?.length);

    /**
     * Runways shown in the table and on the dial.
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
            const automatic = [...new Set([...favouredRunways.value, ...atisRunways])];
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

    /** Shows or hides one runway. The first change starts from the automatic runways; hiding the last one goes back to them */
    function toggleRunway(ident: string, shown: boolean) {
        const selected = new Set(selectedRunways.value);
        if (shown) selected.add(ident);
        else selected.delete(ident);

        // Keep the runway data order, so the table does not jump around while toggling
        selectedRunways.value = runways.value.map(runway => runway.ident).filter(runwayIdent => selected.has(runwayIdent));
    }

    function resetRunways() {
        selectedRunways.value = [];
    }

    const runwayWinds = computed<AwosRunwayWind[]>(() => {
        const selected = new Set(selectedRunways.value);
        const favoured = new Set(favouredRunways.value);

        return runways.value
            .filter(runway => selected.has(runway.ident))
            .map(runway => {
                const wind = getRunwayWind(metar.value?.wind, runway);

                return {
                    ...runway,
                    wind,
                    limits: getRunwayWindLimits(wind, metar.value?.wind?.unit),
                    favoured: favoured.has(runway.ident),
                    atisDeparture: atis.value.departure.includes(runway.ident),
                    atisArrival: atis.value.arrival.includes(runway.ident),
                };
            });
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

    const pendingQnhChange = computed(() => {
        const change = qnhChanges.value[toValue(icaoRef) ?? ''];
        return change && !change.acknowledged ? change : null;
    });

    function acknowledgeQnhChange() {
        const icao = toValue(icaoRef);
        if (!icao || !qnhChanges.value[icao]) return;
        qnhChanges.value = { ...qnhChanges.value, [icao]: { ...qnhChanges.value[icao], acknowledged: true } };
    }

    return reactive({
        /** Parsed METAR, null when it is missing or unreadable */
        metar,
        /** ATIS letter and announced departure/arrival runways */
        atis,
        magneticVariation,
        elevation,
        runways: {
            /** Every runway of the airport that can get wind components */
            all: runways,
            loading: runwaysLoading,
            /** Idents of the runways shown in the table and on the dial */
            selected: selectedRunways,
            /** The shown runways were picked by hand */
            isManual,
            toggle: toggleRunway,
            reset: resetRunways,
            /** Wind and status of each shown runway */
            winds: runwayWinds,
        },
        qnh: {
            /** Unacknowledged QNH change, null when there is none */
            change: pendingQnhChange,
            acknowledge: acknowledgeQnhChange,
        },
    });
}
