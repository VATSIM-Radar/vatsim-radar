import type { VatglassesActivePosition } from '~/utils/data/vatglasses';
import type { IDBVatGlassesCombinedCacheEntry } from '~/composables/render/idb';
import { clientDB } from '~/composables/render/idb';

// Metadata lives in the same table so version checks, entry writes, and cleanup are atomic.
const CACHE_VERSION_KEY = 'version';
const CACHE_ENTRIES_KEY = 'entries';
// Bump this independently when an algorithm change makes old combined geometry incompatible.
const CACHE_FORMAT_VERSION = '1';
// A VATGlasses data version can live for a long time and accumulate many runway/ownership combinations.
const MAX_CACHE_ENTRIES = 100;

/** Combine the source-data version and local output format into one table-wide generation identifier. */
function getCacheVersion(vatglassesVersion: string) {
    return `${ CACHE_FORMAT_VERSION }:${ vatglassesVersion }`;
}

/**
 * Hash the exact geometry input and altitude limits. `activeRunway` can be empty during the first tick of a
 * newly online position, so ownership/runway metadata alone is not strong enough to prove a cache hit is safe.
 */
async function getSectorsFingerprint(position: VatglassesActivePosition) {
    const source = JSON.stringify(position.sectors?.map(sector => [
        sector.properties?.min,
        sector.properties?.max,
        sector.geometry.coordinates,
    ]) ?? []);

    // The fallback is long but collision-free and keeps the cache functional in browsers without Web Crypto.
    if (!globalThis.crypto?.subtle) return source;

    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build a deterministic key for one position input. Dynamic colour and controller data are intentionally absent:
 * they do not affect geometry and are refreshed from the current source sectors after a cache hit.
 */
export async function getVatglassesCombinedCacheKey(
    vatglassesVersion: string,
    countryGroupId: string,
    positionId: string,
    position: VatglassesActivePosition,
) {
    return JSON.stringify([
        getCacheVersion(vatglassesVersion),
        countryGroupId,
        positionId,
        position.airspaceKeys,
        Object.entries(position.activeRunway).sort(([a], [b]) => a.localeCompare(b)),
        await getSectorsFingerprint(position),
    ]);
}

/**
 * Advance the cache generation transactionally. Clearing first ensures no entry from another VATGlasses or
 * algorithm version can survive while the new metadata is already visible.
 */
export async function ensureVatglassesCombinedCacheVersion(vatglassesVersion: string) {
    const expectedVersion = getCacheVersion(vatglassesVersion);

    await clientDB.transaction('rw', clientDB.vatglassesCombined, async () => {
        const currentVersion = await clientDB.vatglassesCombined.get(CACHE_VERSION_KEY);
        if (currentVersion === expectedVersion) return;

        await clientDB.vatglassesCombined.clear();
        await clientDB.vatglassesCombined.put(expectedVersion, CACHE_VERSION_KEY);
        await clientDB.vatglassesCombined.put('[]', CACHE_ENTRIES_KEY);
    });
}

/** Return only entries whose own generation still matches the requested source version. */
export async function getVatglassesCombinedCache(key: string, vatglassesVersion: string) {
    const entry = await clientDB.vatglassesCombined.get(key);
    if (!entry || typeof entry === 'string' || entry.version !== getCacheVersion(vatglassesVersion)) return null;
    return entry.sectors;
}

/**
 * Store a completed position only if its source generation is still current. This guard prevents a slow worker
 * from restoring old geometry after a version update has already cleared the table.
 */
export async function setVatglassesCombinedCache(
    key: string,
    vatglassesVersion: string,
    sectors: IDBVatGlassesCombinedCacheEntry['sectors'],
) {
    const expectedVersion = getCacheVersion(vatglassesVersion);

    await clientDB.transaction('rw', clientDB.vatglassesCombined, async () => {
        const currentVersion = await clientDB.vatglassesCombined.get(CACHE_VERSION_KEY);
        if (currentVersion !== expectedVersion) return;

        await clientDB.vatglassesCombined.put({
            version: expectedVersion,
            sectors,
        }, key);

        const entriesValue = await clientDB.vatglassesCombined.get(CACHE_ENTRIES_KEY);
        let entries: string[] = [];
        if (typeof entriesValue === 'string') {
            try {
                const parsed = JSON.parse(entriesValue);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) entries = parsed;
            }
            catch { /* Rebuild malformed cache metadata below. */ }
        }

        // Maintain a compact FIFO key list instead of reading and cloning every large cached GeoJSON value.
        entries = entries.filter(entryKey => entryKey !== key);
        entries.push(key);
        const expiredKeys = entries.splice(0, Math.max(0, entries.length - MAX_CACHE_ENTRIES));
        if (expiredKeys.length) await clientDB.vatglassesCombined.bulkDelete(expiredKeys);
        await clientDB.vatglassesCombined.put(JSON.stringify(entries), CACHE_ENTRIES_KEY);
    });
}
