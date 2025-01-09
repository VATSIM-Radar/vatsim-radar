<template>
    <common-info-popup
        v-if="atc"
        v-model:collapsed="overlay.collapsed"
        v-model:tab="tab"
        class="atc"
        collapsible
        :header-actions="['sticky']"
        max-height="100%"
        model-value
        :tabs="{
            info: {
                title: 'Info',
                sections: [{ key: 'data' }, { key: 'atis' }],
            },
            pilots: {
                title: 'Pilots',
                sections: [{ key: 'pilots' }],
                disabled: true,
            },
        }"
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
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
                <div class="atc__info">
                    <common-spoiler type="controller">
                        <common-info-block
                            :bottom-items="[
                                shortRating,
                                stats?.total ? `${ stats.total }h total time` : null,
                                stats?.rating ? `${ stats.rating }h on ${ shortRating }` : null,
                            ]"
                            class="atc__sections_section atc__sections_section--self"
                            :top-items="[atc.name, atc.cid]"
                        >
                            <template #bottom="{ item, index }">
                                <common-bubble
                                    v-if="index === 0"
                                    class="atc__rating"
                                >
                                    {{ item }}
                                </common-bubble>
                                <template v-else>
                                    {{ item }}
                                </template>
                            </template>
                        </common-info-block>

                        <template #name>
                            Show Controller Info
                        </template>
                    </common-spoiler>
                    <common-favorite-list
                        :cid="atc.cid"
                        :name="atc.name"
                    />
                </div>
                <div
                    v-if="airport"
                    class="atc__sections_section atc__airport"
                >
                    <div class="atc__airport_title">
                        Airport
                    </div>
                    <common-info-block
                        :bottom-items="[airport?.name]"
                        class="atc__airport_content"
                        is-button
                        :top-items="[airport?.icao, country?.country]"
                        @click="mapStore.addAirportOverlay(airport.icao)"
                    />
                </div>
                <common-atc-time-online
                    class="atc__time-online"
                    :controller="atc"
                />
            </div>
        </template>
        <template #atis>
            <div class="atc__sections">
                <common-copy-info-block
                    v-if="atc.text_atis"
                    class="atc__sections_section"
                    :text="parseEncoding(atc.text_atis.join(' '), atc.callsign)"
                >
                    ATIS
                </common-copy-info-block>
                <div
                    v-else
                    class="atc__atis-error"
                >
                    ATIS NOT AVAIL
                </div>
            </div>
        </template>
        <template #pilots>
            <small>Pilots connected to <common-bubble type="primary-flat">{{ atc.frequency }}</common-bubble> are shown here.</small><br><br>

            <div class="__info-sections">
                <common-info-block
                    v-for="pilot in pilots"
                    :key="pilot.cid"
                    :bottom-items="[
                        pilot.departure && `from ${ pilot.departure }`,
                        pilot.arrival && `to ${ pilot.arrival }`,
                        `Squawk ${ pilot.transponder ?? 'unknown' }`,
                    ]"
                    class="aircraft__pilot"
                    is-button
                    :top-items="[
                        pilot.callsign,
                        pilot.name,
                        pilot.aircraft_faa ?? 'No flight plan',
                    ]"
                    @click="mapStore.addPilotOverlay(pilot.cid.toString())"
                />
            </div>
        </template>
        <template
            v-if="tab === 'info'"
            #actions
        >
            <common-button-group>
                <common-button
                    :disabled="!airport || airport.isPseudo"
                    @click="showOnMap"
                >
                    <template #icon>
                        <location-icon/>
                    </template>
                    <template v-if="atc.facility !== facilities.APP">
                        Focus On Map
                    </template>
                    <template v-else>
                        Focus ({{ airport?.icao ?? airport?.iata }})
                    </template>
                </common-button>
                <common-button
                    :href="`https://stats.vatsim.net/stats/${ atc.cid }`"
                    target="_blank"
                >
                    <template #icon>
                        <dashboard-icon/>
                    </template>
                    View Stats
                </common-button>
                <common-button @click="copy.copy(`${ config.public.DOMAIN }/?atc=${ atc.callsign }`)">
                    <template #icon>
                        <share-icon/>
                    </template>
                    <template v-if="copy.copyState.value">
                        Copied!
                    </template>
                    <template v-else>
                        Link
                    </template>
                </common-button>
            </common-button-group>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAtc } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import CommonAtcTimeOnline from '~/components/common/vatsim/CommonAtcTimeOnline.vue';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import DashboardIcon from '@/assets/icons/kit/dashboard.svg?component';
import { parseEncoding } from '~/utils/data';
import type { Map } from 'ol';
import { findAtcAirport, showAtcOnMap } from '~/composables/atc';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import { getVATSIMMemberStats } from '~/composables/data';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import CommonFavoriteList from '~/components/common/vatsim/CommonFavoriteList.vue';
import ShareIcon from '@/assets/icons/kit/share.svg?component';

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
const tab = ref('info');
const config = useRuntimeConfig();
const copy = useCopyText();

const atc = computed(() => {
    return findAtcByCallsign(props.overlay?.data.callsign);
});

const pilots = computed(() => {
    return dataStore.vatsim.data.pilots.value.filter(x => x.frequencies.some(x => atc.value?.frequency.startsWith(x))).sort((a, b) => a.callsign.localeCompare(b.callsign));
});

const airport = computed(() => {
    if (!atc.value || atc.value.facility === facilities.CTR) return;
    return findAtcAirport(atc.value);
});

const country = computed(() => {
    const icaoAirport = dataStore.vatspy.value?.data.airports.find(x => x.icao === airport.value?.icao && x.iata === airport.value?.iata);

    return getAirportCountry(icaoAirport?.icao);
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

watch(atc, value => {
    if (value) return;
    close();
}, {
    immediate: true,
});

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
const { data: stats } = useLazyAsyncData(`stats-atc-${ atc.value?.cid ?? Math.random() }`, () => getVATSIMMemberStats(atc.value!, 'atc'));
</script>

<style scoped lang="scss">
.atc {
    @include fromTablet {
        height: 100%;
    }

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

    &__info {
        display: flex;
        gap: 16px;
        align-items: center;

        >:first-child {
            flex-grow: 1;
        }
    }

    &__airport {
        display: flex;
        gap: 16px;
        align-items: center;

        &_title {
            font-size: 13px;
            font-weight: 600;
        }

        &_content {
            width: 100%;
        }
    }

    &__atis-error {
        font-weight: 600;
        color: $error500;
        text-align: center;
    }
}
</style>
