<template>
    <popup-overlay
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
                sections: getSections,
            },
        }"
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
    >
        <template #action-sticky>
            <map-overlay-pin-icon :overlay="overlay"/>
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
                    <ui-spoiler type="controller">
                        <ui-text-block
                            :bottom-items="[
                                shortRating,
                                stats?.total ? `${ stats.total }h total time` : null,
                                stats?.rating ? `${ stats.rating }h on ${ shortRating }` : null,
                            ]"
                            class="atc__sections_section atc__sections_section--self"
                            :top-items="[atc.name, atc.cid]"
                        >
                            <template #bottom="{ item, index }">
                                <ui-bubble
                                    v-if="index === 0"
                                    class="atc__rating"
                                >
                                    {{ item }}
                                </ui-bubble>
                                <template v-else>
                                    {{ item }}
                                </template>
                            </template>
                        </ui-text-block>

                        <template #name>
                            Show Controller Info
                        </template>
                    </ui-spoiler>
                    <settings-favorite-list
                        v-if="store.user"
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
                    <ui-text-block
                        :bottom-items="[airport?.name]"
                        class="atc__airport_content"
                        is-button
                        :top-items="[airport?.icao, country?.country]"
                        @click="mapStore.addAirportOverlay(airport.icao)"
                    />
                </div>
                <vatsim-controller-time-online
                    class="atc__time-online"
                    :controller="atc"
                    full
                />
            </div>
        </template>
        <template #frequencies>
            <ui-notification
                cookie-name="atc-frequencies"
                type="info"
            >
                Those are frequencies this ATC is listening to - you should only contact this ATC on primary frequency, unless instructed otherwise (highlighted with blue)
            </ui-notification>
            <div class="atc__frequencies">
                <div
                    v-for="frequency in atc.frequencies?.filter((x, index) => !atc?.frequencies?.some((y, yIndex) => x === y && yIndex < index))"
                    :key="frequency"
                    class="atc__frequencies_item"
                    :class="{ 'atc__frequencies_item--primary': atc.frequency === frequency }"
                >
                    {{frequency}}
                </div>
            </div>
        </template>
        <template #atis>
            <div class="atc__sections">
                <ui-copy-info
                    v-if="atc.text_atis"
                    auto-expand
                    class="atc__sections_section"
                    :text="getATIS(atc, false)?.join('\n')"
                >
                    ATC Information
                </ui-copy-info>
                <div
                    v-else
                    class="atc__atis-error"
                >
                    INFO NOT AVAIL
                </div>
            </div>
        </template>
        <template #pilots>
            <small>Pilots connected to <ui-bubble type="primary-flat">{{ atc.frequency }}</ui-bubble> are shown here.</small><br><br>

            <div class="__info-sections">
                <ui-text-block
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
            <ui-button-group>
                <ui-button
                    :disabled="!airport || airport.isPseudo || atc.facility === facilities.CTR || atc.facility === facilities.FSS"
                    @click="showOnMap"
                >
                    <template #icon>
                        <location-icon/>
                    </template>
                    <template v-if="!airport || airport.isPseudo || atc.facility === facilities.CTR || atc.facility === facilities.FSS">
                        Focus On Map
                    </template>
                    <template v-else>
                        Focus ({{ airport?.icao ?? airport?.iata }})
                    </template>
                </ui-button>
                <ui-button
                    :href="`https://stats.vatsim.net/stats/${ atc.cid }`"
                    target="_blank"
                >
                    <template #icon>
                        <dashboard-icon/>
                    </template>
                    View Stats
                </ui-button>
                <ui-button @click="copy.copy(`${ config.public.DOMAIN }/?atc=${ atc.callsign }`)">
                    <template #icon>
                        <share-icon/>
                    </template>
                    <template v-if="copy.copyState.value">
                        Copied!
                    </template>
                    <template v-else>
                        Link
                    </template>
                </ui-button>
            </ui-button-group>
        </template>
    </popup-overlay>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAtc } from '~/store/map';
import MapOverlayPinIcon from '~/components/map/overlays/MapOverlayPinIcon.vue';
import VatsimControllerTimeOnline from '~/components/features/vatsim/controllers/VatsimControllerTimeOnline.vue';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import DashboardIcon from '@/assets/icons/kit/dashboard.svg?component';
import type { Map } from 'ol';
import { findAtcAirport, showAtcOnMap } from '~/composables/vatsim/controllers';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { InfoPopupSection } from '~/components/popups/PopupOverlay.vue';
import { getVATSIMMemberStats } from '~/composables/render/storage';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';
import SettingsFavoriteList from '~/components/features/settings/SettingsFavoriteList.vue';
import ShareIcon from '@/assets/icons/kit/share.svg?component';
import { useStore } from '~/store';
import type { VatSpyAirport } from '~/types/data/vatspy';
import UiNotification from '~/components/ui/data/UiNotification.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAtc>,
        required: true,
    },
});

const facilities = useFacilitiesIds();

const store = useStore();
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

const getSections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [{ key: 'data' }, { key: 'atis' }];

    if (atc.value?.frequencies?.length) sections.splice(1, 0, { key: 'frequencies', title: 'Frequencies' });

    return sections;
});

const airport = shallowRef<null | VatSpyAirport>(null);

watch(() => props.overlay?.data.callsign, async val => {
    if (atc.value) {
        airport.value = await findAtcAirport(atc.value);
    }
}, {
    immediate: true,
});

const country = computed(() => {
    const icaoAirport = airport.value?.icao && dataStore.vatspy.value?.data.keyAirports.realIcao[airport.value?.icao ?? ''] === dataStore.vatspy.value?.data.keyAirports.iata[airport.value?.iata ?? ''];

    return icaoAirport ? getAirportCountry(airport.value?.icao) : undefined;
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

    &__frequencies {
        user-select: text;

        display: flex;
        gap: 4px;

        font-size: 12px;
        font-weight: 600;


        &_item {
            order: 2;

            &--primary {
                order: 1;
                color: $primary500;
            }
        }
    }
}
</style>
