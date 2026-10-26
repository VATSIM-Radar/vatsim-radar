import * as v from 'valibot';
import type { AirportStand, AirportStandData, StandInformationSource } from '~/types/data/stands';

const identifier = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128));
const date = v.pipe(v.string(), v.isoDate(), v.check(value => {
    const parsed = new Date(`${ value }T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}));
const aircraftTypes = v.nullable(v.pipe(v.array(v.pipe(v.string(), v.regex(/^[A-Z][A-Z0-9]{1,3}$/))), v.maxLength(1000)));
const sourceSchema = v.object({
    id: identifier,
    kind: v.picklist(['vacc', 'aim', 'aip', 'import']),
    url: v.pipe(v.string(), v.maxLength(2048), v.url(), v.regex(/^https?:\/\//)),
    reference: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(4000)),
    effective_date: v.nullable(date),
    accessed_at: date,
});
const airportSchema = v.object({
    schema_version: v.literal(1),
    airport: v.object({ icao: v.pipe(v.string(), v.regex(/^[A-Z]{4}$/)) }),
    data_status: v.picklist(['reviewed', 'unreviewed']),
    reviewed_at: v.nullable(date),
    sources: v.pipe(v.array(sourceSchema), v.minLength(1), v.maxLength(512)),
    stands: v.pipe(v.array(v.unknown()), v.maxLength(20000)),
});
const standSchema = v.object({
    id: identifier,
    latitude: v.pipe(v.number(), v.finite(), v.minValue(-90), v.maxValue(90)),
    longitude: v.pipe(v.number(), v.finite(), v.minValue(-180), v.maxValue(180)),
    max_wingspan_m: v.nullable(v.pipe(v.number(), v.finite(), v.minValue(0), v.check(value => value > 0))),
    approved_aircraft: aircraftTypes,
    prohibited_aircraft: aircraftTypes,
    source_ids: v.pipe(v.array(identifier), v.minLength(1), v.maxLength(512)),
    notes: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(4000)))),
});

export function normalizeCommunityStands(data: unknown, icao: string): AirportStandData {
    const result = v.safeParse(airportSchema, data);
    if (!result.success || result.output.airport.icao !== icao) throw new Error('Invalid community stand dataset');
    const airport = result.output;
    if (airport.data_status === 'reviewed' && !airport.reviewed_at) throw new Error('Missing stand review date');
    const sources = new Map<string, StandInformationSource>();
    for (const source of airport.sources) {
        if (sources.has(source.id)) throw new Error('Duplicate stand source');
        sources.set(source.id, {
            id: source.id,
            kind: source.kind,
            url: source.url,
            reference: source.reference,
            effectiveDate: source.effective_date,
            accessedAt: source.accessed_at,
        });
    }

    const parsedStands = airport.stands.map(stand => v.safeParse(standSchema, stand)).filter(stand => stand.success).map(stand => stand.output);
    const counts = new Map<string, number>();
    for (const stand of parsedStands) counts.set(stand.id.toUpperCase(), (counts.get(stand.id.toUpperCase()) ?? 0) + 1);
    const gates: AirportStand[] = [];

    for (const stand of parsedStands) {
        // Ambiguous IDs and unresolved provenance must not become selectable stand information.
        if (counts.get(stand.id.toUpperCase()) !== 1 || stand.source_ids.some(id => !sources.has(id))) continue;
        const standSources = [...new Set(stand.source_ids)].map(id => sources.get(id)!);
        const effectiveDates = new Set(standSources.map(source => source.effectiveDate));
        gates.push({
            gate_identifier: stand.id,
            name: stand.id,
            airport_identifier: icao,
            gate_latitude: stand.latitude,
            gate_longitude: stand.longitude,
            standInformation: {
                source: 'vatdata-stands',
                sourceUrl: 'https://github.com/bjerrecs/vatdata-stands',
                license: 'GPL-3.0',
                effectiveDate: effectiveDates.size === 1 ? standSources[0]!.effectiveDate : null,
                maximumWingspan: stand.max_wingspan_m,
                approvedAircraft: stand.approved_aircraft ? [...new Set(stand.approved_aircraft)] : null,
                prohibitedAircraft: stand.prohibited_aircraft ? [...new Set(stand.prohibited_aircraft)] : null,
                notes: stand.notes || null,
                sources: standSources,
                reviewStatus: airport.data_status,
                reviewedAt: airport.data_status === 'reviewed' ? airport.reviewed_at : null,
            },
        });
    }

    return { airport: icao, gates };
}

export const getCommunityAirportStands = defineCachedFunction(async (icao: string): Promise<AirportStandData> => {
    try {
        const data = await $fetch<unknown>(`https://raw.githubusercontent.com/bjerrecs/vatdata-stands/main/airports/${ icao.toLowerCase() }.json`, {
            timeout: 5000,
            retry: 0,
            responseType: 'json',
        });
        return normalizeCommunityStands(data, icao);
    }
    catch (error) {
        if ((error as { statusCode?: number }).statusCode === 404) return { airport: icao, gates: [] };
        throw error;
    }
}, {
    name: 'community-airport-stands-v1',
    maxAge: 60 * 60,
    swr: true,
    getKey: (icao: string) => icao,
});
