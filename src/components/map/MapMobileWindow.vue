<template>
    <transition name="mobile-window--item-appear">
        <div
            v-if="store.featuredAirportsOpen || store.menuFriendsOpen || (overlay && !overlay.collapsed)"
            class="mobile-window"
            :style="{ '--collapsed-height': `${ overlaysHeight }px` }"
        >
            <common-info-popup
                v-if="store.featuredAirportsOpen"
                max-height="unset"
                model-value
                :sections="[{ key: 'content' }]"
                @update:modelValue="store.featuredAirportsOpen = false"
            >
                <template #title>
                    Featured Airports
                </template>
                <template #content>
                    <map-featured-airports/>
                </template>
            </common-info-popup>
            <common-info-popup
                v-if="store.menuFriendsOpen"
                max-height="unset"
                model-value
                :sections="[{ key: 'content' }]"
                @update:modelValue="store.menuFriendsOpen = false"
            >
                <template #title>
                    Favorite
                </template>
                <template #content>
                    <view-user-list :users="store.friends"/>
                </template>
            </common-info-popup>
            <map-popup
                v-else-if="overlay && !overlay.collapsed"
                class="mobile-window_popup"
                max-height="auto"
                :overlay
            />
        </div>
    </transition>
    <div
        v-if="mapStore.overlays.length"
        class="mobile-overlays"
    >
        <transition-group name="mobile-overlays--appear">
            <common-button
                v-for="item in mapStore.overlays"
                :key="item.id"
                size="S"
                :type="item.collapsed ? 'secondary' : 'primary'"
                @click="mapStore.activeMobileOverlay === item.id ? [item.collapsed = true, mapStore.activeMobileOverlay = null] : [mapStore.overlays.forEach(x => x.collapsed = true), item.collapsed = false, mapStore.activeMobileOverlay = item.id]"
            >
                <div
                    class="mobile-overlays__collapsed-btn"
                    :class="[`mobile-overlays__collapsed-btn--${ item.type }`]"
                >
                    <span class="mobile-overlays__collapsed-btn_text">
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
                    </span>

                    <div
                        v-if="item.type === 'airport' && airports[item.data.icao] && item.collapsed"
                        class="mobile-overlays__counters"
                    >
                        <div
                            v-for="(counter, key) in airports[item.data.icao]"
                            :key="key"
                            class="mobile-overlays__counters_counter"
                            :class="[`mobile-overlays__counters_counter--${ key }`]"
                        >
                            {{ counter }}
                        </div>
                    </div>

                    <div
                        class="mobile-overlays__collapsed-btn_close"
                        @click="mapStore.overlays = mapStore.overlays.filter(x => x.id !== item.id)"
                    >
                        <close-icon width="12"/>
                    </div>
                </div>
            </common-button>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { useMapStore } from '~/store/map';
import MapPopup from '~/components/map/popups/MapPopup.vue';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import { useStore } from '~/store';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import ViewUserList from '~/components/views/ViewUserList.vue';

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const overlay = computed(() => mapStore.overlays.find(x => x.id === mapStore.activeMobileOverlay));

onMounted(() => {
    const uncollapsed = mapStore.overlays.find(x => !x.collapsed);

    watch(() => mapStore.overlays.length, (val, oldVal) => {
        if (val && !oldVal) mapStore.activeMobileOverlay = mapStore.overlays.find(x => !x.collapsed)?.id ?? null;
    }, {
        once: true,
    });

    if (uncollapsed) {
        mapStore.activeMobileOverlay = uncollapsed.id;
        mapStore.overlays = mapStore.overlays.map(x => ({
            ...x,
            collapsed: x.id !== uncollapsed.id,
        }));
    }
});

const overlaysHeight = computed(() => {
    const btnHeight = 32;
    const gap = 8;
    const perRow = 2;

    const rows = Math.ceil(mapStore.overlays.length / perRow);

    return (rows * btnHeight) + (gap * (rows - 1)) + 8;
});

const airports = computed(() => {
    return mapStore.overlays.filter(x => x.type === 'airport').map(airport => {
        const vatAirport = dataStore.vatsim.data.airports.value.find(x => 'icao' in airport.data && x.icao === airport.data.icao);
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
</script>

<style scoped lang="scss">
.mobile-window {
    position: absolute;
    z-index: 6;
    top: 24px;
    left: 40px + 8px + 16px;

    display: flex;
    justify-content: flex-end;

    width: calc(100% - 40px - 8px - 8px - 16px);
    height: calc(100% - 48px - var(--collapsed-height));

    &_popup {
        width: 100%;
    }

    &--item-appear {
        &-enter-active,
        &-leave-active {
            transition: 0.3s;
        }

        &-enter-from,
        &-leave-to {
            top: -10px;
            opacity: 0;
        }
    }
}

.mobile-overlays {
    position: absolute;
    z-index: 7;
    bottom: 24px;
    left: 16px + 32px + 8px;

    display: grid;
    grid-template-columns: repeat(2, calc(50% - 8px));
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;

    width: calc(100% - 16px - 32px - 8px - 8px);

    &__collapsed-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &--airport {
            display: flex;
            gap: 2px;
            align-items: center;
            justify-content: space-between;

            width: 100%;
        }

        &_close {
            padding: 4px;
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
            height: 0;
            max-height: 0;
            margin-top: -16px;
            opacity: 0;
        }
    }
}
</style>
