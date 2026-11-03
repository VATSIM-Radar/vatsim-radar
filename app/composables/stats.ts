import type { StatsRange } from '~/types/data/stats';

export function useHistoricalStats<T>(type: 'airports' | 'airlines' | 'aircraft' | 'routes' | 'atc') {
    const data = shallowRef<T[] | null>(null);
    const range = shallowRef<StatsRange | null>(null);
    const loading = ref(false);
    let requestId = 0;

    async function load(nextRange: StatsRange | null, combined = false) {
        range.value = nextRange;
        const currentRequest = ++requestId;
        if (!nextRange) {
            data.value = null;
            loading.value = false;
            return;
        }

        loading.value = true;
        try {
            const result = await $fetch<T[]>(`/api/data/stats/${ type }`, {
                query: { from: nextRange.from.toISOString(), to: nextRange.to.toISOString(), ...(type === 'atc' ? { combined } : {}) },
            });
            if (currentRequest === requestId) data.value = result;
        }
        finally {
            if (currentRequest === requestId) loading.value = false;
        }
    }

    return { data, range, loading, load };
}
