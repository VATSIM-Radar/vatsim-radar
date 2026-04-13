<template>
    <div
        v-if="mapStore.overlays.length"
        class="minified-overlays"
        :class="{
            'minified-overlays--procedures': hasProcedures,
            'minified-overlays--top-left': !isMobile && store.mapSettings.overlaysPositions === 'top-left',
        }"
    >
        <transition-group name="minified-overlays--appear">
            <ui-button
                v-for="item in mapStore.overlays.filter(x => isTouch || x.minified)"
                :key="item.id"
                v-on-long-press="[() => isTouch && ((item.type !== 'airport' || hoveredAirport === item.data.icao) ? hoveredAirport = '' : (hoveredAirport = item.data.icao)), { delay: 200, modifiers: { prevent: true } }]"
                size="S"
                :type="item.minified ? 'secondary' : 'primary'"
                @click="itemClick(item)"
                @mouseleave="hoveredAirport = ''"
                @mouseover="!isTouch && item.type === 'airport' && (hoveredAirport = item.data.icao)"
            >
                <div
                    class="minified-overlays__minified-btn"
                    :class="[`minified-overlays__minified-btn--${ item.type }`]"
                >
                    <ui-text
                        class="minified-overlays__minified-btn_text"
                        tag="span"
                        type="3b-medium"
                    >
                        <template v-if="item.type === 'pilot'">
                            {{ item.data.pilot.callsign }}
                        </template>
                        <template v-else-if="item.type === 'prefile'">
                            {{ item.data.prefile.callsign }}
                        </template>
                        <template v-else-if="item.type === 'atc'">
                            {{ item.data.callsign }}
                        </template>
                        <template v-else-if="item.type === 'airport'">
                            {{ item.data.icao }}
                        </template>
                    </ui-text>

                    <transition name="minified-overlays__rate--appear">
                        <ui-text
                            v-if="item.type === 'airport' && hoveredAirport === item.data.icao"
                            class="minified-overlays__rate"
                            type="caption-medium"
                        >
                            <vatsim-traffic-rate
                                :aircraft="airportAircraft"
                                :icon-color="radarColors.lightgray200"
                                :text-color="radarColors.error500"
                                use-opacity
                            />
                        </ui-text>
                    </transition>

                    <div
                        v-if="item.type === 'airport' && airports[item.data.icao] && item.minified"
                        class="minified-overlays__counters"
                    >
                        <div
                            v-for="(counter, key) in airports[item.data.icao]"
                            :key="key"
                            class="minified-overlays__counters_counter"
                            :class="[`minified-overlays__counters_counter--${ key }`]"
                        >
                            {{ counter }}
                        </div>
                    </div>

                    <div
                        class="minified-overlays__minified-btn_close"
                        @click="mapStore.overlays = mapStore.overlays.filter(x => x.id !== item.id)"
                    >
                        <close-icon width="12"/>
                    </div>
                </div>
            </ui-button>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import type { StoreOverlay } from '~/store/map';
import UiText from '~/components/ui/text/UiText.vue';
import VatsimTrafficRate from '~/components/features/vatsim/airport/VatsimTrafficRate.vue';
import { getAircraftForAirport } from '~/composables/vatsim/airport';
import { vOnLongPress } from '@vueuse/components';

const isMobile = useIsMobile();
const isTouch = useIsTouch();
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const hasProcedures = computed(() => Object.values(dataStore.navigraphProcedures.value).some(x => Object.keys(x!.sids).length || Object.keys(x!.stars).length || Object.keys(x!.approaches).length));

const airports = computed(() => {
    return mapStore.overlays.filter(x => x.type === 'airport').map(airport => {
        const vatAirport = 'icao' in airport.data && dataStore.airportsList.value[airport.data.icao];
        if (vatAirport) {
            return {
                icao: 'icao' in airport.data && airport.data.icao,
                departures: vatAirport.aircraft.departures?.length ?? 0,
                ground: (vatAirport.aircraft.groundDep?.length ?? 0) + (vatAirport.aircraft.groundArr?.length ?? 0),
                arrivals: vatAirport.aircraft.arrivals?.length ?? 0,
            };
        }

        return null;
    }).filter(x => !!x).reduce((obj, item) => {
        const icao = item!.icao as string;
        // @ts-expect-error we are ok with that
        delete item!.icao;

        return {
            ...obj,
            [icao]: item,
        };
    }, {} as Record<string, Record<string, any> | null>);
});

const hoveredAirport = ref('');

const airportAircraft = computed(() => hoveredAirport.value
    ? getAircraftForAirport({
        icao: hoveredAirport.value,
    }).value
    : null);

function itemClick(item: StoreOverlay) {
    if (isMobile.value) {
        if (mapStore.activeMobileOverlay === item.id) {
            item.minified = true;
            mapStore.activeMobileOverlay = null;
        }
        else {
            mapStore.overlays.forEach(x => x.minified = true);
            item.minified = false;
            mapStore.activeMobileOverlay = item.id;
        }
    }
    else item.minified = false;
}
onMounted(() => {
    watch(() => mapStore.overlays.length, (val, oldVal) => {
        if (!isMobile.value) return;
        if (val && !oldVal) mapStore.activeMobileOverlay = mapStore.overlays.find(x => !x.minified)?.id ?? null;
    }, {
        once: true,
    });

    watch(isMobile, val => {
        if (!val) return;
        const unminified = mapStore.overlays.find(x => !x.minified && !x.collapsed);

        if (unminified) {
            mapStore.activeMobileOverlay = unminified.id;
        }

        mapStore.overlays = mapStore.overlays.map(x => ({
            ...x,
            minified: unminified ? x.id !== unminified.id : true,
        }));
    }, {
        immediate: true,
    });
});
</script>

<style scoped lang="scss">
.minified-overlays {
    pointer-events: none;

    position: absolute;
    z-index: 7;
    bottom: 16px;
    left: 16px + 32px + 8px;

    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;

    width: 50dvw;

    transition: 0.3s;

    >* {
        pointer-events: initial;
        position: relative;
    }

    @include mobileOnly {
        display: grid;
        grid-template-columns: repeat(2, calc(50% - 8px));
        justify-content: space-between;
        width: calc(100% - 16px - 32px - 8px - 8px);
    }

    &--procedures {
        bottom: 40px + 16px;
    }

    &__rate {
        position: absolute;
        right: 0;
        bottom: calc(100% + 4px);

        display: flex;
        gap: 4px;
        justify-content: center;

        width: 100%;
        padding: 2px 4px;
        border-radius: 4px;

        background: $darkGray800;

        &--appear {
            &-enter-active,
            &-leave-active {
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                bottom: 100%;
                opacity: 0;
            }
        }
    }

    &__minified-btn {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: space-between;

        &--airport {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        &_close {
            padding: 4px;

            @include hover {
                transition: 0.3s;

                &:hover {
                    color: $red500;
                }
            }
        }
    }

    &__counters {
        position: relative;
        display: flex;
        gap: 4px;
        font-size: 10px;

        &_counter {
            &--departures {
                color: $success300;
            }

            &--ground {
                color: $lightgray100;
            }

            &--arrivals {
                color: $error500;
            }
        }
    }

    &--appear {
        &-enter-active,
        &-leave-active {
            overflow: hidden;
            transition: 0.3s
        }

        &-enter-from,
        &-leave-to {
            width: 0;
            margin-right: -8px;
            padding: 0;
            opacity: 0;

            @include mobileOnly {
                height: 0;
                max-height: 0;
                margin-top: -8px;
            }
        }
    }

    &--top-left {
        top: 16px;
        bottom: auto;
        left: 16px + 40px + 8px;

        .minified-overlays__rate {
            top: calc(100% + 4px);
            bottom: auto;
        }
    }
}
</style>
