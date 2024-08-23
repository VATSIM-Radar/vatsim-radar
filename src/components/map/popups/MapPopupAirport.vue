<template>
    <common-info-popup
        v-if="airport"
        v-model:collapsed="overlay.collapsed"
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
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #action-counts>


            <div
                class="airport__counts"
                :class="{ 'airport__counts--ground_departures': listGroundDepartures }"
            >
                <common-tooltip
                    location="bottom"
                    :open-method="store.localSettings.tutorial?.mapAirportPopupDepartureCount ? 'disabled' : 'mouseOver'"
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
                </common-tooltip>
                <common-tooltip
                    class="detailed_counts"
                    :class="{ 'detailed_counts--ground_departures': listGroundDepartures }"
                    :close-method="arrivalCountTooltipCloseMethod"
                    location="bottom"
                    open-method="mouseOver"
                    width="100%"
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
                            <common-tooltip
                                class="airport__counts-tooltip_question"
                                location="bottom"
                                width="150px"
                            >
                                <template #activator>
                                    <div>
                                        <question-icon width="14"/>
                                    </div>
                                </template>
                                - The left column shows the aircrafts on the ground.<br>- The right column shows the expected arrivals in 15-minute intervals from top to bottom.
                            </common-tooltip>
                        </div>
                    </div>
                    <div
                        class="airport__counts-tooltip_column"
                    >
                        <map-popup-rate
                            :aircraft="aircraft"
                            :icon-color="radarColors.lightgray200"
                            :text-color="radarColors.error500"
                            use-opacity
                        />
                    </div>
                </common-tooltip>
            </div>
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
        <template #aircraft>
            <div
                v-if="vatAirport?.aircraft.arrivals?.length"
                class="airport__aircraft-toggles"
            >
                <common-toggle
                    :model-value="!!props.overlay.data.showTracks"
                    @update:modelValue="props.overlay.data.showTracks = $event"
                >
                    Show tracks for arriving
                </common-toggle>
            </div>
            <airport-aircraft nav-offset="56px"/>
        </template>
        <template #actions>
            <common-button-group>
                <common-button :to="`/airport/${ airport.icao }`">
                    <template #icon>
                        <data-icon/>
                    </template>
                    Dashboard
                </common-button>
                <common-button
                    :disabled="!airport || airport.isPseudo"
                    @click="showOnMap"
                >
                    <template #icon>
                        <map-icon/>
                    </template>
                    Focus
                </common-button>
                <common-button @click="copy.copy(`${ config.public.DOMAIN }/?airport=${ airport.icao }`)">
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
import type { StoreOverlayAirport } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import MapPopupRate from '~/components/map/popups/MapPopupRate.vue';
import { showAirportOnMap, useDataStore } from '#imports';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import type { InfoPopupContent } from '~/components/common/popup/CommonInfoPopup.vue';
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/pilots';
import { useStore } from '~/store';
import { getAircraftForAirport, getATCForAirport, provideAirport } from '~/composables/airport';
import AirportMetar from '~/components/views/airport/AirportMetar.vue';
import AirportTaf from '~/components/views/airport/AirportTaf.vue';
import AirportNotams from '~/components/views/airport/AirportNotams.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import AirportInfo from '~/components/views/airport/AirportInfo.vue';
import AirportAircraft from '~/components/views/airport/AirportAircraft.vue';
import AirportControllers from '~/components/views/airport/AirportControllers.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import DataIcon from '@/assets/icons/kit/data.svg?component';
import ShareIcon from '@/assets/icons/kit/share.svg?component';
import QuestionIcon from 'assets/icons/basic/question.svg?component';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';
import type { TooltipCloseMethod } from '~/components/common/basic/CommonTooltip.vue';
import type { Map } from 'ol';

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

const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === props.overlay.data.icao));
const vatAirport = computed(() => dataStore.vatsim.data.airports.value.find(x => x.icao === props.overlay.data.icao));
const data = computed(() => props.overlay.data.airport);
const notams = computed(() => props.overlay.data.notams);
const listGroundDepartures = ref(false); // TODO: When a settings page exists, add a toggle to the settings to set the default value
const arrivalCountTooltipCloseMethod = ref<TooltipCloseMethod>('mouseLeave');

const showOnMap = () => {
    if (!airport.value) return;
    showAirportOnMap(airport.value, map.value);
};

const aircraftCount = computed(() => Object.values(vatAirport.value?.aircraft ?? {}).reduce((acc, items) => acc + items.length, 0));

const tabs = computed<InfoPopupContent>(() => {
    const list: InfoPopupContent = {
        atc: {
            title: 'ATC & Aircraft',
            sections: [],
        },
        info: {
            title: 'Info & Weather',
            sections: [],
        },
    };

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

    if (atc.value.length) {
        list.atc.sections.push({
            title: 'Active Controllers',
            collapsible: true,
            key: 'atc',
            bubble: atc.value[0]?.facility === -2 ? 0 : atc.value.length,
        });
    }

    if (aircraftCount.value) {
        list.atc.sections.push({
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

watch(dataStore.vatsim.updateTimestamp, async () => {
    props.overlay.data.airport = {
        ...props.overlay.data.airport,
        ...await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ props.overlay.key }?requestedDataType=2`),
    };
});

onMounted(() => {
    const interval = setInterval(async () => {
        props.overlay.data.airport = {
            ...props.overlay.data.airport,
            ...await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ props.overlay.key }?requestedDataType=1`),
        };
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
            font-size: 13px;
            font-weight: 600;
            border-top: 1px solid varToRgba('lightgray150', 0.15);
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
</style>
