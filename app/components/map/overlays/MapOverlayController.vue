<template>
    <popup-overlay
        v-if="atc"
        v-model:collapsed="overlay.collapsed"
        v-model:minified="overlay.minified"
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
            {{ props.overlay.data.callsign }}
        </template>
        <template #data>
            <ui-notification
                v-if="atc.duplicatedBy"
                type="info"
            >
                This facility is owned and extended by {{atc.duplicatedBy}}
            </ui-notification>
            <div class="atc__sections">
                <div class="atc__info">
                    <ui-data-container>
                        <ui-data-list :items="[{ key: 'name', text: atc.name }, { key: 'cid', text: atc.cid }, { key: 'favorite', text: 'favorite' }]">
                            <template #item-name="{ item }">
                                <ui-spoiler type="controller">
                                    {{item.text}}
                                </ui-spoiler>
                            </template>
                            <template #item-cid="{ item }">
                                <ui-spoiler
                                    is-cid
                                    type="controller"
                                >
                                    <ui-bubble
                                        text-type="caption"
                                        type="primary-flat"
                                    >
                                        {{item.text}}
                                    </ui-bubble>
                                </ui-spoiler>
                            </template>
                            <template #item-favorite>
                                <settings-favorite-list
                                    v-if="store.user"
                                    :cid="atc.cid"
                                    :icon-size="12"
                                    is-popup
                                    :name="atc.name"
                                />
                            </template>
                        </ui-data-list>
                        <ui-data-list
                            :items="[
                                { key: 'rating', title: 'Rating', text: shortRating },
                                { key: 'total', title: 'Total Hours', text: stats?.total, hide: !stats },
                                { key: 'on-rating', title: `Hours on ${ shortRating }`, text: stats?.rating, hide: !stats },
                                { key: 'time-online', title: 'Time Online', text: getATCTime(atc) },
                            ]"
                        >
                            <template #item-rating>
                                <ui-bubble>
                                    {{ shortRating }}
                                </ui-bubble>
                            </template>
                            <template #item-total="{ item }">
                                <span class="atc__chip">
                                    <ui-chip text-type="3b-medium-alt">{{numberFormatter.format(+item.text!)}}</ui-chip>
                                </span>
                            </template>
                            <template #item-on-rating="{ item }">
                                <span class="atc__chip">
                                    <ui-chip text-type="3b-medium-alt">{{numberFormatter.format(+item.text!)}}</ui-chip>
                                </span>
                            </template>
                            <template #item-time-online="{ item }">
                                <span class="atc__chip">
                                    <ui-chip text-type="3b-medium-alt">{{item.text}}</ui-chip>
                                </span>
                            </template>
                        </ui-data-list>
                    </ui-data-container>
                </div>
            </div>
        </template>
        <template #frequencies>
            <div class="__vertical-group-16">
                <ui-notification
                    remember-message="ATC_FREQUENCIES"
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
            <div class="__info-sections">
                <ui-text-block
                    v-for="pilot in pilots"
                    :key="pilot.cid"
                    :bottom-items="[
                        pilot.departure && `from ${ pilot.departure }`,
                        pilot.arrival && `to ${ pilot.arrival }`,
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
                    :disabled="!airport && !feature"
                    @click="showOnMap"
                >
                    <template #icon>
                        <location-icon/>
                    </template>
                    Focus On Map
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
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import DashboardIcon from '@/assets/icons/kit/dashboard.svg?component';
import type { Map } from 'ol';
import { findAtcAirport, findATCSector, getATCTime, showAtcOnMap } from '~/composables/vatsim/controllers';
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
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiDataContainer from '~/components/ui/data/UiDataContainer.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import { isPointInExtent } from '~/composables';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAtc>,
        required: true,
    },
});

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const tab = ref('info');
const config = useRuntimeConfig();
const copy = useCopyText();

const numberFormatter = new Intl.NumberFormat('ru-RU');

const atc = computed(() => {
    return findAtcByCallsign(props.overlay?.data.callsign);
});

const getSections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [{ key: 'data' }, { key: 'atis' }];

    if (atc.value?.frequencies?.length) sections.splice(1, 0, { key: 'frequencies', title: 'Frequencies' });

    if (pilots.value.length) sections.push({ key: 'pilots', title: 'Controlling aircraft', bubble: pilots.value.length });

    return sections;
});

const airport = shallowRef<null | VatSpyAirport>(null);

const feature = computed(() => {
    if (!atc.value) return null;
    return findATCSector(atc.value);
});

const pilots = computed(() => {
    if (!feature.value) return [];

    const frequenciesSet = new Set(atc.value?.frequencies ?? []);

    return dataStore.vatsim.data.pilots.value.filter(pilot => pilot.frequencies.some(x => frequenciesSet.has(x) && isPointInExtent([pilot.longitude, pilot.latitude], feature.value!))).sort((a, b) => a.callsign.localeCompare(b.callsign));
});

function focusOnFeature() {
    if (!feature.value) return;

    map.value?.getView().fit(feature.value, {
        duration: 300,
    });
}

watch(() => props.overlay?.data.callsign, async val => {
    if (atc.value) {
        airport.value = await findAtcAirport(atc.value);
    }
}, {
    immediate: true,
});

const shortRating = computed(() => {
    return dataStore.vatsim.data.ratings.value.find(x => x.id === atc.value?.rating)?.short;
});

const close = () => {
    mapStore.overlays = mapStore.overlays.filter(x => x.id !== props.overlay.id);
};

const showOnMap = () => {
    if (!atc.value) return;
    if (feature.value) focusOnFeature();
    else {
        showAtcOnMap(atc.value, map.value);
    }
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
        color: $red500;
        text-align: center;
    }

    &__frequencies {
        user-select: text;

        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        font-size: 12px;
        font-weight: 600;


        &_item {
            order: 2;

            &--primary {
                order: 1;
                color: $blue500;
            }
        }
    }

    &__chip {
        display: flex;
        gap: 4px;
        align-items: center;
    }
}
</style>
