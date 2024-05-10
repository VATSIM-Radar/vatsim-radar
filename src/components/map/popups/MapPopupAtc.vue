<template>
    <common-info-popup
        class="atc"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        max-height="100%"
        :header-actions="['sticky']"
        :sections="[
            {key: 'data'},
            {key: 'atis'},
        ]"
        v-if="atc"
    >
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #title>
            <div class="pilot-header">
                <div class="pilot-header_title">
                    {{ props.overlay.data.callsign }}
                </div>
            </div>
        </template>
        <template #data>
            <div class="atc__sections">
                <common-info-block
                    class="atc__sections_section atc__sections_section--self" :top-items="[atc.name, atc.cid]" :bottom-items="[
                        shortRating,
                        overlay.data.stats?.atc ? `${Math.floor(overlay.data.stats?.atc)}h total time` : null,
                        //@ts-expect-error
                        overlay.data.stats?.[shortRating.toLowerCase()] ? `${Math.floor(overlay.data.stats[shortRating.toLowerCase()])}h on ${shortRating}` : null,
                    ]"
                >
                    <template #bottom="{item, index}">
                        <div class="atc__rating" v-if="index === 0">
                            {{ item }}
                        </div>
                        <template v-else>
                            {{ item }}
                        </template>
                    </template>
                </common-info-block>
                <div class="atc__sections_section atc__airport" v-if="airport">
                    <div class="atc__airport_title">
                        Airport
                    </div>
                    <common-info-block
                        is-button class="atc__airport_content" :top-items="[airport?.icao, country?.country]"
                        :bottom-items="[airport?.name]"
                        @click="mapStore.addAirportOverlay(airport.icao)"
                    />
                </div>
                <common-atc-time-online class="atc__time-online" :controller="atc"/>
            </div>
        </template>
        <template #atis>
            <div class="atc__sections">
                <common-copy-info-block
                    class="atc__sections_section" :text="parseEncoding(atc.text_atis.join(' '))"
                    v-if="atc.text_atis"
                >
                    ATIS
                </common-copy-info-block>
                <div class="atc__atis-error" v-else>
                    ATIS NOT AVAIL
                </div>
                <common-button-group class="atc__actions">
                    <common-button @click="showOnMap" :disabled="!airport || airport.isPseudo">
                        <template #icon>
                            <map-icon/>
                        </template>
                        <template v-if="atc.facility !== facilities.APP">
                            Focus On Map
                        </template>
                        <template v-else>
                            Focus ({{ airport?.icao ?? airport?.iata }})
                        </template>
                    </common-button>
                    <common-button :href="`https://stats.vatsim.net/stats/${atc.cid}`" target="_blank">
                        <template #icon>
                            <stats-icon/>
                        </template>
                        View Stats
                    </common-button>
                </common-button-group>
            </div>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAtc } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import CommonAtcTimeOnline from '~/components/common/CommonAtcTimeOnline.vue';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import StatsIcon from '@/assets/icons/kit/stats.svg?component';
import { parseEncoding } from '~/utils/data';
import type { Map } from 'ol';
import { findAtcAirport, showAtcOnMap } from '~/composables/atc';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAtc>,
        required: true,
    },
});

const facilities = useFacilitiesIds();

const mapStore = useMapStore();
const dataStore = useDataStore();
const map = inject<ShallowRef<Map | null>>('map')!;

const atc = computed(() => {
    return findAtcByCallsign(props.overlay?.data.callsign);
});

const airport = computed(() => {
    if (!atc.value || atc.value.facility === facilities.CTR) return;
    return findAtcAirport(atc.value);
});

const country = computed(() => {
    return dataStore.vatspy.value?.data.countries.find(x => x.code === airport?.value?.icao.slice(0, 2));
});

const shortRating = computed(() => {
    return dataStore.vatsim.data.ratings.value.find(x => x.id === atc.value?.rating)?.short;
});

const close = () => {
    mapStore.overlays = mapStore.overlays.filter(x => x.id !== props.overlay.id);
};

const showOnMap = () => {
    if (!atc.value) return;
    showAtcOnMap(atc.value, map.value);
};

watch(atc, (value) => {
    if (value) return;
    close();
}, {
    immediate: true,
});
</script>

<style scoped lang="scss">
.atc {
    height: 100%;

    &__sections {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_section {
            &--self {
                :deep(.info-block_bottom) {
                    margin-top: 4px;
                }
            }
        }
    }

    &__rating {
        min-width: 40px;
        padding: 4px;
        border-radius: 4px;
        background: $primary500;
        color: $neutral150;
        font-weight: 600;
        font-size: 11px;
        line-height: 100%;
        text-align: center;
    }

    &__airport {
        display: flex;
        align-items: center;
        gap: 16px;

        &_title {
            font-weight: 600;
            font-size: 13px;
        }

        &_content {
            width: 100%;
        }
    }

    &__actions {
        margin-top: 8px;
    }

    &__atis-error {
        color: $error500;
        text-align: center;
        font-weight: 600;
    }
}
</style>
