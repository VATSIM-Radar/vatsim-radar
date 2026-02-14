<template>
    <div
        v-if="allAtis.length"
        class="airport-atis"
    >
        <div
            v-for="atis in allAtis"
            :key="atis.callsign"
            class="airport-atis_entry"
        >
            <div class="airport-atis_header">
                <div class="airport-atis_info">
                    <span class="airport-atis_callsign">{{ atis.callsign }}</span>
                    <div
                        v-if="!atis.active"
                        class="airport-atis_time"
                    >
                        Last updated: {{ formatTime(atis.timestamp) }}
                    </div>
                </div>
                <div class="airport-atis_meta">
                    <div class="airport-atis_details">
                        <span class="airport-atis_name">{{ atis.name }}</span>
                        <ui-chip
                            v-if="atis.rating"
                            size="XS"
                            variant="accent"
                        >
                            {{ getRating(atis.rating) }}
                        </ui-chip>
                    </div>
                    <ui-separator
                        distance="0"
                        style="height: 24px;"
                    />
                    <ui-tooltip
                        v-if="!atis.active"
                        location="left"
                        width="120px"
                    >
                        <template #activator>
                            <ui-chip
                                size="S"
                                :variant="atis.active ? 'default' : 'warning'"
                            >
                                {{ `Info ${ atis.atis_code }` }}
                            </ui-chip>
                        </template>
                        This ATIS is {{ getStaleTimeText(atis.timestamp) }} and is no longer being managed.
                    </ui-tooltip>
                    <ui-chip
                        v-else
                        size="S"
                        :variant="atis.active ? 'default' : 'warning'"
                    >
                        {{ `Info ${ atis.atis_code }` }}
                    </ui-chip>
                </div>
            </div>
            <ui-copy-info
                auto-expand
                class="airport-atis_text"
                :text="atis.text_atis.length ? atis.text_atis.join('\n') : 'No ATIS text available'"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '~/composables/render/storage';
import { injectAirport } from '~/composables/vatsim/airport';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';

const data = injectAirport();
const dataStore = useDataStore();

interface AtisEntry {
    callsign: string;
    text_atis: string[];
    atis_code: string;
    timestamp: number;
    active: boolean;
    name?: string;
    rating?: number;
}

const allAtis = computed<AtisEntry[]>(() => {
    const icao = data.value?.icao;
    if (!icao) return [];

    // Live ATIS from global state (locals contains controllers, some of which are ATIS)
    const liveAtis: AtisEntry[] = dataStore.vatsim.data.locals.value
        .filter(a => a.atc.callsign.startsWith(`${ icao }_`) && a.atc.callsign.endsWith('_ATIS'))
        .map(a => ({
            callsign: a.atc.callsign,
            text_atis: a.atc.text_atis ?? [],
            atis_code: a.atc.atis_code ?? '',
            timestamp: Date.now(),
            active: true,
            name: a.atc.name,
            rating: a.atc.rating,
        }));

    // Historical ATIS from airport specific data
    const historicalAtis = data.value.airport?.lastAtis?.map(a => ({
        ...a,
        active: false,
    })) ?? [];

    // Combine and filter duplicates (prefer live)
    const combined = [...liveAtis];
    historicalAtis.forEach(hist => {
        if (!combined.some(live => live.callsign === hist.callsign)) {
            combined.push(hist);
        }
    });

    return combined.sort((a, b) => a.callsign.localeCompare(b.callsign));
});

const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().substring(11, 16) + 'Z';
};

const getRating = (rating: number) => {
    return dataStore.vatsim.data.ratings.value.find(x => x.id === rating)?.short ?? '';
};

const getStaleTimeText = (timestamp: number) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (hours >= 1) return `${ hours } hour${ hours === 1 ? '' : 's' } old`;
    return `${ minutes } minute${ minutes === 1 ? '' : 's' } old`;
};
</script>

<style scoped lang="scss">
.airport-atis {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &_entry {
        display: flex;
        flex-direction: column;
    }

    &_header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        flex-wrap: wrap;
    }

    &_info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
    }

    &_meta {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    &_callsign {
        font-size: 14px;
        font-weight: 500;
        color: $lightGray100;
    }

    &_details {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
    }

    &_name {
        font-size: 12px;
        color: $lightGray200;
        text-align: right;
    }

    &_text {
        margin-top: 8px;

        :deep(.copy-info_textarea) {
            font-family: monospace;
            font-size: 12px;
            text-transform: uppercase;
        }
    }

    &_time {
        font-size: 11px;
        color: $lightGray200;
        opacity: 0.7;
    }
}
</style>
