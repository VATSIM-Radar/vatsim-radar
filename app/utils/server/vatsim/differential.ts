import type { H3Event } from 'h3';
import { radarStorage } from '~/utils/server/storage';
import { handleH3Error } from '~/utils/server/h3';
import { isValidDate } from '~/utils/shared';
import type { VatsimActiveCallsigns } from '~/types/data/vatsim';

export const vatsimDifferentialCollections = ['pilots', 'controllers', 'atis', 'prefiles', 'observers'] as const;

type VatsimDifferentialCollection = typeof vatsimDifferentialCollections[number];

const pilotPositionFields = new Set(['latitude', 'longitude', 'heading']);

/**
 * Creates a response containing only entities updated after an API-issued ISO
 * cursor. The full payload remains untouched when the cursor is absent.
 */
export function filterVatsimDataByTimestamp<T extends Record<string, unknown>>(
    event: H3Event,
    data: T,
    collections: readonly VatsimDifferentialCollection[] = vatsimDifferentialCollections,
    includeActiveCallsigns = true,
    pilotTimestamps?: Record<number, string> | null,
): T | undefined {
    const query = getQuery(event);
    const timestamp = query.timestamp;
    if (!timestamp) return data;

    if (typeof timestamp !== 'string' || !isValidDate(new Date(timestamp))) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid date',
        });
        return;
    }

    const result: Record<string, unknown> = { ...data };
    const includePositionUpdates = query.includePositionUpdates === 'true';

    for (const collection of collections) {
        const items = result[collection];
        if (!Array.isArray(items)) continue;

        const changedItems = items.filter(item => {
            if (!item || typeof item !== 'object') return false;

            const cid = Array.isArray(item)
                ? item[0]
                : 'cid' in item
                    ? item.cid
                    : 'ci' in item
                        ? item.ci
                        : undefined;
            const updatedAt = typeof cid === 'number'
                ? collection === 'pilots' && pilotTimestamps
                    ? pilotTimestamps[cid]
                    : collection === 'pilots' && includePositionUpdates
                        ? radarStorage.vatsim.mandatoryDifferentialUpdate?.[cid]
                        : radarStorage.vatsim.differentialUpdate?.[collection]?.[cid]
                : undefined;

            return !updatedAt || updatedAt > timestamp;
        });
        result[collection] = collection === 'pilots'
            ? changedItems.map(item => Array.isArray(item) ? item : getPilotPatch(item, includePositionUpdates)).filter(item => item !== undefined)
            : changedItems;
    }

    if (includeActiveCallsigns) {
        const activeCallsigns = {} as VatsimActiveCallsigns;
        for (const collection of vatsimDifferentialCollections) {
            const allItems = data[collection];
            const changedItems = result[collection];
            if (!Array.isArray(allItems) || !Array.isArray(changedItems)) continue;

            const changedCallsigns = new Set(changedItems.map(getCallsign).filter((callsign): callsign is string => !!callsign));
            activeCallsigns[collection] = allItems.map(getCallsign).filter((callsign): callsign is string => !!callsign && !changedCallsigns.has(callsign));
        }
        result.activeCallsigns = activeCallsigns;
    }

    return result as T;
}

function getPilotPatch(item: unknown, includePositionUpdates: boolean): Record<string, unknown> | undefined {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;

    const pilot = item as Record<string, unknown>;
    const cid = typeof pilot.cid === 'number' ? pilot.cid : typeof pilot.ci === 'number' ? pilot.ci : undefined;
    if (cid === undefined) return;

    const fields = radarStorage.vatsim.pilotDifferentialFields?.[cid];
    if (!fields) return pilot;

    // Compact dictionaries are rebuilt for every response. Emit normalized pilot
    // patches instead of partial encoded records, whose indexes could refer to a
    // different dictionary than the client cache.
    const source = ('ci' in pilot
        ? radarStorage.vatsim.regularData?.pilots.find(currentPilot => currentPilot.cid === cid)
        : pilot) as Record<string, unknown> | undefined;
    if (!source) return;

    const result: Record<string, unknown> = { cid: source.cid, callsign: source.callsign };

    for (const field of fields) {
        if (!includePositionUpdates && pilotPositionFields.has(field)) continue;
        if (field === 'callsign') continue;
        result[field] = source[field as keyof typeof source] ?? null;
    }

    return Object.keys(result).length > 2 ? result : undefined;
}

function getCallsign(item: unknown): string | undefined {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    if ('callsign' in item && typeof item.callsign === 'string') return item.callsign;
    if ('ca' in item && typeof item.ca === 'string') return item.ca;
}
