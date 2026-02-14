<template>
    <popup-overlay
        v-if="airport"
        v-model:collapsed="overlay.collapsed"
        v-model:tab="tab"
        class="airport"
        collapsible
        :disabled="store.config.airport === props.overlay.data.icao"
        :header-actions="(store.config.airport === props.overlay.data.icao && overlay.sticky) ? ['counts'] : ['counts', 'sticky']"
        max-height="100%"
        model-value
        :tabs
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
    >
        <template #title>
            <div class="pilot-header">
                <div class="pilot-header_title">
                    {{ props.overlay.data.icao }}
                </div>
            </div>
        </template>
        <template
            v-if="runways"
            #runways
        >
            <map-airport-runway-selector
                :airport="props.overlay.data.icao"
            />
        </template>
        <template
            #bars
        >
            <map-airport-bars-info :data="dataStore.vatsim.data.bars.value[airport.icao] ?? []"/>
        </template>
        <template #action-sticky>
            <map-overlay-pin-icon :overlay="overlay"/>
        </template>
        <template #action-counts>
            <div
                class="airport__counts airport__counts--root"
                :class="{ 'airport__counts--ground_departures': listGroundDepartures }"
            >
                <ui-tooltip
                    location="bottom"
                    :open-method="(overlay.collapsed || store.localSettings.tutorial?.mapAirportPopupDepartureCount) ? 'disabled' : 'mouseOver'"
                    width="120px"
                    @click="setUserLocalSettings({ tutorial: { mapAirportPopupDepartureCount: true } })"
                >
                    <template #activator>
                        <div
                            class="airport__counts_counter"
                            :style="{ '--color': `rgb(var(--${ getPilotStatus('depTaxi').color }))` }"
                            @click="listGroundDepartures = !listGroundDepartures"
                        >
                            <template v-if="!listGroundDepartures">
                                <departing-icon
                                    class="airport__counts_counter_icon"
                                />
                                <div
                                    class="airport__counts_counter_icon_text"
                                >
                                    {{ aircraft?.departures.length ?? 0 }}
                                </div>
                            </template>
                            <template v-else>
                                <ground-icon
                                    class="airport__counts_counter_icon"
                                />
                                <div
                                    class="airport__counts_counter_icon_text"
                                >
                                    {{ aircraft?.groundDep.length ?? 0 }}
                                </div>
                            </template>
                        </div>
                    </template>
                    With a click you can switch between "already airborne departures", which is the default, and "departures on the ground".
                </ui-tooltip>
                <ui-tooltip
                    class="detailed_counts"
                    :class="{ 'detailed_counts--ground_departures': listGroundDepartures }"
                    :close-method="arrivalCountTooltipCloseMethod"
                    location="bottom"
                    :open-method="overlay.collapsed ? 'disabled' : 'mouseOver'"
                    @click="arrivalCountTooltipCloseMethod = arrivalCountTooltipCloseMethod === 'mouseLeave' ? 'click' : 'mouseLeave'"
                >
                    <template #activator>
                        <div
                            class="airport__counts"
                        >
                            <div
                                v-if="!listGroundDepartures"
                                class="airport__counts_counter"
                                :style="{ '--color': `rgb(var(--lightgray150))` }"
                            >
                                <ground-icon class="airport__counts_counter_icon"/>
                                <div class="airport__counts_counter_icon_text">
                                    {{ (aircraft?.groundArr.length ?? 0) + (aircraft?.groundDep.length ?? 0) }}
                                </div>
                            </div>
                            <div
                                class="airport__counts_counter"
                                :style="{ '--color': `rgb(var(--${ getPilotStatus('arrTaxi').color }))` }"
                            >
                                <arriving-icon class="airport__counts_counter_icon"/>
                                <div class="airport__counts_counter_icon_text">
                                    {{ (aircraft?.arrivals.length ?? 0) }}
                                </div>
                            </div>
                        </div>
                    </template>
                    <div
                        class="airport__counts-tooltip_column airport__counts-tooltip_column--first"
                    >
                        <div class="airport__counts-tooltip_column_counts">

                            <div
                                class="airport__counts-tooltip_counts airport__counts-tooltip_counts--groundDep"
                            >
                                {{ aircraft?.groundDep?.length ?? 0 }}
                            </div>
                            <div
                                class="airport__counts-tooltip_counts airport__counts-tooltip_counts--prefiles"
                            >
                                {{ aircraft?.prefiles?.length ?? 0 }}
                            </div>
                            <div
                                class="airport__counts-tooltip_counts airport__counts-tooltip_counts--groundArr"
                            >
                                {{ aircraft?.groundArr?.length ?? 0 }}
                            </div>
                            <ui-tooltip
                                class="airport__counts-tooltip_question"
                                location="bottom"
                                width="150px"
                            >
                                <template #activator>
                                    <div>
                                        <question-icon width="14"/>
                                    </div>
                                </template>
                                - The left column shows the aircraft on the ground.<br>- The right column shows the expected arrivals in 15-minute intervals from top to bottom.
                            </ui-tooltip>
                        </div>
                    </div>
                    <div
                        class="airport__counts-tooltip_column"
                    >
                        <vatsim-traffic-rate
                            :aircraft="aircraft"
                            :icon-color="radarColors.lightgray200"
                            :text-color="radarColors.error500"
                            use-opacity
                        />
                    </div>
                </ui-tooltip>
            </div>
        </template>
        <template
            v-if="data?.lastAtis?.length || atc.some(x => x.callsign.endsWith('_ATIS'))"
            #atis
        >
            <airport-atis/>
        </template>
        <template
            v-if="data?.metar"
            #metar
        >
            <airport-metar/>
        </template>
        <template
            v-if="data?.taf"
            #taf
        >
            <airport-taf/>
        </template>
        <template
            v-if="notams?.length"
            #notams
        >
            <airport-notams/>
        </template>
        <template
            v-if="procedures"
            #procedures
        >
            <airport-procedures
                :airport="props.overlay.key"
                from="airportOverlay"
            />
        </template>
        <template #bookmark>
            <div class="__info-sections">
                <ui-input-text v-model="bookmarkName">
                    Name
                </ui-input-text>
                <settings-bookmark-options
                    :airport="airport.icao"
                    :bookmark
                />
                <ui-button
                    :disabled="!bookmarkName || store.bookmarks.some(x => x.name.toLowerCase() === bookmarkName.toLowerCase())"
                    size="S"
                    @click="createBookmark"
                >
                    Save
                </ui-button>
            </div>
        </template>
        <template
            v-if="vatInfo"
            #airport
        >
            <airport-info/>
        </template>
        <template
            v-else
            #name
        >
            <div class="airport__name">
                {{ airport.name }}
            </div>
        </template>
        <template #atc>
            <airport-controllers/>
        </template>
        <template #bookings>
            <vatsim-controllers-list
                class="booking-controller-info"
                :controllers="bookings"
                max-height="170px"
                show-facility
            />
        </template>
        <template #aircraft>
            <div
                v-if="vatAirport?.aircraft.arrivals?.length"
                class="airport__aircraft-toggles"
            >
                <ui-toggle
                    :model-value="!!props.overlay.data.showTracks"
                    @update:modelValue="props.overlay.data.showTracks = $event"
                >
                    Show aircraft tracks
                </ui-toggle>
            </div>
            <airport-aircraft
                :mode="props.overlay.data.aircraftTab"
                nav-offset="56px"
            />
        </template>
        <template #actions>
            <ui-button-group>
                <ui-button :to="`/airport/${ airport.icao }`">
                    <template #icon>
                        <data-icon/>
                    </template>
                    Dashboard
                </ui-button>
                <ui-button
                    :disabled="!airport || airport.isPseudo"
                    @click="showOnMap"
                >
                    <template #icon>
                        <location-icon/>
                    </template>
                    Focus
                </ui-button>
                <ui-button @click="copy.copy(`${ config.public.DOMAIN }/?airport=${ airport.icao }`)">
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
                <ui-button
                    :href="`https://where2fly.today/?icao=${ airport.icao }&utm_source=vatsimradar&utm_medium=airport-popup`"
                    target="_blank"
                >
                    <template #icon>
                        <aircraft-unknown-dest-icon/>
                    </template>
                    Where2Fly
                </ui-button>
            </ui-button-group>
        </template>
    </popup-overlay>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport } from '~/store/map';
import MapOverlayPinIcon from '~/components/map/overlays/MapOverlayPinIcon.vue';
import VatsimTrafficRate from '~/components/features/vatsim/airport/VatsimTrafficRate.vue';
import { getNavigraphAirportProcedures, sendUserPreset, showAirportOnMap, useDataStore } from '#imports';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { InfoPopupContent } from '~/components/popups/PopupOverlay.vue';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/vatsim/pilots';
import { useStore } from '~/store';
import { getAircraftForAirport, getATCForAirport, provideAirport } from '~/composables/vatsim/airport';
import AirportMetar from '~/components/features/vatsim/airport/AirportMetar.vue';
import AirportAtis from '~/components/features/vatsim/airport/AirportAtis.vue';
import AirportTaf from '~/components/features/vatsim/airport/AirportTaf.vue';
import AirportNotams from '~/components/features/vatsim/airport/AirportNotams.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import AirportInfo from '~/components/features/vatsim/airport/AirportInfo.vue';
import AirportAircraft from '~/components/features/vatsim/airport/AirportAircraft.vue';
import AirportControllers from '~/components/features/vatsim/airport/AirportControllers.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import DataIcon from '@/assets/icons/kit/data.svg?component';
import ShareIcon from '@/assets/icons/kit/share.svg?component';
import AircraftUnknownDestIcon from '@/assets/icons/kit/aircraft-unknown-dest.svg?component';
import QuestionIcon from 'assets/icons/basic/question.svg?component';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipCloseMethod } from '~/components/ui/data/UiTooltip.vue';
import type { Map } from 'ol';
import MapAirportRunwaySelector from '~/components/map/airports/MapAirportRunwaySelector.vue';
import { getAirportRunways } from '~/utils/data/vatglasses-front';
import type { UserBookmark } from '~/utils/server/handlers/bookmarks';
import SettingsBookmarkOptions from '~/components/features/settings/SettingsBookmarkOptions.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import VatsimControllersList from '~/components/features/vatsim/controllers/VatsimControllersList.vue';
import { useRadarError } from '~/composables/errors';
import MapAirportBarsInfo from '~/components/map/airports/MapAirportBarsInfo.vue';
import AirportProcedures from '~/components/features/vatsim/airport/AirportProcedures.vue';

import type { VatsimAirportDataNotam } from '~/utils/server/notams';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
});

const overlayData = computed(() => props.overlay.data);
provideAirport(overlayData);
const atc = getATCForAirport(overlayData);
const aircraft = getAircraftForAirport(overlayData);
const map = inject<ShallowRef<Map | null>>('map')!;

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const copy = useCopyText();
const config = useRuntimeConfig();

const airport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.overlay.data.icao]);
const vatAirport = computed(() => dataStore.vatsim.data.airports.value.find(x => x.icao === props.overlay.data.icao));
const data = computed(() => props.overlay.data.airport);
const notams = computed(() => props.overlay.data.notams);
const listGroundDepartures = ref(false); // TODO: When a settings page exists, add a toggle to the settings to set the default value
const arrivalCountTooltipCloseMethod = ref<TooltipCloseMethod>('mouseLeave');

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const { data: procedures } = await useLazyAsyncData(`${ props.overlay.key }-procedures-lazy`, () => getNavigraphAirportProcedures(props.overlay.key));

const bookings = computed(() => {
    const atcs: VatsimShortenedController[] = [];
    data.value?.bookings?.forEach(b => {
        const atc = makeFacilityFromBooking(b);
        if (!atc) return;

        atcs.push(atc);
    });

    return atcs;
});

const showOnMap = () => {
    if (!airport.value) return;
    showAirportOnMap(airport.value, map.value);
};

const aircraftCount = computed(() => Object.values(vatAirport.value?.aircraft ?? {}).reduce((acc, items) => acc + items.length, 0));

const bookmarkName = ref('');
const bookmark = ref<UserBookmark>({ zoom: 14 });
const createBookmark = async () => {
    await sendUserPreset(bookmarkName.value, bookmark.value, 'bookmarks', createBookmark);
    await store.fetchBookmarks();
};

const tab = ref<StoreOverlayAirport['data']['tab']>('aircraft');

watch(() => props.overlay?.data.tab, changedTab => {
    if (!changedTab) return;
    tab.value = changedTab;
});

const tabs = computed<InfoPopupContent>(() => {
    const list: InfoPopupContent = {
        aircraft: {
            title: 'Aircraft',
            disabled: !aircraftCount.value,
            sections: [],
        },
        atc: {
            title: 'ATC',
            disabled: !atc.value.length && !bookings.value.length,
            sections: [],
        },
        procedures: {
            title: 'Proc',
            disabled: !procedures.value?.sids.length && !procedures.value?.stars.length && !procedures.value?.approaches.length,
            sections: [
                {
                    key: 'procedures',
                },
            ],
        },
        info: {
            title: 'Info',
            sections: [],
        },
    };

    if (!store.bookmarks.some(x => x.json.icao === airport.value!.icao) && store.user) {
        list.info.sections.push({
            key: 'bookmark',
            title: 'Bookmark',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

    if (vatInfo.value) {
        list.info.sections.push({
            title: 'VATSIM Airport Info',
            collapsible: true,
            key: 'airport',
        });
    }
    else {
        list.info.sections.push({
            title: 'Airport name',
            key: 'name',
        });
    }

    if (runways.value) {
        list.info.sections.push({
            title: 'Active Runways',
            collapsible: true,
            key: 'runways',
        });
    }

    if (dataStore.vatsim.data.bars.value[airport.value!.icao]) {
        list.info.sections.push({
            title: 'BARS is in use',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'bars',
        });
    }

    if (data.value?.lastAtis?.length || atc.value.some(x => x.callsign.endsWith('_ATIS'))) {
        list.info.sections.push({
            title: 'ATIS',
            collapsible: true,
            key: 'atis',
        });
    }

    if (data.value?.metar) {
        list.info.sections.push({
            title: 'METAR',
            collapsible: true,
            collapsedDefault: !!vatInfo.value,
            collapsedDefaultOnce: true,
            key: 'metar',
        });
    }

    if (data.value?.taf) {
        list.info.sections.push({
            title: 'TAF',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'taf',
        });
    }

    if (notams.value?.length) {
        list.info.sections.push({
            title: 'NOTAMS',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'notams',
        });
    }

    if (data.value?.bookings?.length) {
        list.atc.sections.push({
            title: 'Booked Controllers',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'bookings',
        });
    }

    if (atc.value.length) {
        list.atc.sections.push({
            title: 'Active Controllers',
            collapsible: true,
            key: 'atc',
            bubble: atc.value[0]?.facility === -2 ? 0 : atc.value.length,
        });
    }

    if (aircraftCount.value) {
        list.aircraft.sections.push({
            title: 'Aircraft',
            collapsible: true,
            key: 'aircraft',
            bubble: aircraftCount.value,
        });
    }

    if (!list.info.sections.length) delete list.info;

    return list;
});

const vatInfo = computed(() => {
    return data.value?.vatInfo;
});

let updateInProgress = false;

watch(dataStore.vatsim.updateTimestamp, async () => {
    if (updateInProgress) return;
    updateInProgress = true;
    try {
        props.overlay.data.airport = {
            ...props.overlay.data.airport,
            ...await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ props.overlay.key }?requestedDataType=2`),
        };
    }
    catch (e) {
        useRadarError(e);
    }
    finally {
        updateInProgress = false;
    }
});

const runways = computed(() => getAirportRunways(props.overlay.data.icao));

onMounted(() => {
    const interval = setInterval(async () => {
        if (!store.isTabVisible) return;
        props.overlay.data.airport = {
            ...props.overlay.data.airport,
            ...await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ props.overlay.key }?requestedDataType=1`),
        };

        props.overlay.data.notams = await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ airport.value?.icao }/notams`, {
            timeout: 1000 * 15,
        });
    }, 1000 * 60 * 5);

    onBeforeUnmount(() => {
        clearInterval(interval);
    });
});
</script>

<style scoped lang="scss">
.airport {
    :deep(.info-popup__section--type-atc) {
        .info-popup__section_separator_title {
            background: transparent;
        }
    }

    @include mobileOnly {
        :deep(.info-popup_content_tabs) {
            margin-top: 20px;
        }
    }

    &__name {
        font-size: 12px;
        font-weight: 600;
    }

    &__ground-toggles {
        transition: 0.3s ease-in-out;

        &--hidden {
            pointer-events: none;
            opacity: 0.2;
        }
    }

    &__counts {
        display: flex;
        gap: 4px;
        align-items: center;

        font-size: 12px;
        font-weight: 700;
        line-height: 100%;

        @include mobileOnly {
            &--root {
                position: absolute;
                top: 40px;
                right: 0;

                padding: 4px;
                border-radius: 4px;

                background: $darkgray1000;
            }
        }

        &--ground_departures {
            gap: 14px;
        }

        &_counter {
            display: flex;
            gap: 2px;
            align-items: center;
            color: var(--color);

            &_icon {
                width: 16px;
            }
        }
    }

    &__sections {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &--notams {
            overflow: auto;
            max-height: 230px;

            > *:not(:first-child) {
                padding-top: 8px;
                border-top: 1px solid varToRgba('lightgray150', 0.15);
            }
        }

        &_title {
            padding-top: 8px;
            border-top: 1px solid varToRgba('lightgray150', 0.15);
            font-size: 13px;
            font-weight: 600;
        }
    }

    &__info-section {
        display: grid;
        grid-template-columns: 20% 75%;
        align-items: center;
        justify-content: space-between;

        &_title {
            font-size: 13px;
            font-weight: 600;
        }
    }
}


:deep(.detailed_counts > .tooltip_container) {
    cursor: initial;
    margin-left: 5px;

    & .tooltip_container_content_text {
        display: flex;
        gap: 15px;
    }
}

:deep(.detailed_counts--ground_departures > .tooltip_container) {
    margin-left: -18px;
}

.detailed_counts.tooltip {
    .airport__counts-tooltip {
        &_column {
            display: flex;
            flex-direction: column;
            gap: 6px;

            width: 35px;

            font-size: 12px;
            font-weight: 700;
            line-height: 100%;

            &--first{
                align-items: flex-end;
            }

            &_counts {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
        }

        &_question {
            align-self: center;
            align-self: flex-start;
            margin-top: 3px;
        }

        &_counts {
            display: flex;
            gap: 3px;
            justify-content: space-between;
            font-weight: 600;

            &::before {
                content: '';
                position: relative;
                display: block;
            }

            &--groundDep {
                color: $success500;

                &::before {
                    top: -2px;

                    border-top: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid currentColor;
                    border-left: 6px solid transparent;
                }
            }

            &--prefiles {
                color: $lightgray200;

                &::before {
                    top: 3px;
                    width: 11px;
                    height: 5px;
                    background: currentColor;
                }
            }

            &--groundArr {
                color: $error300;

                &::before {
                    top: 2px;

                    border-top: 6px solid currentColor;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid transparent;
                    border-left: 6px solid transparent;
                }
            }
        }
    }
}

.booking-controller-info {
    width: 100%;
}
</style>
