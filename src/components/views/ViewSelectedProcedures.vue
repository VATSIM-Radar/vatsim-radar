<template>
    <div class="procedures">
        <transition-group name="procedures_airport--appear">
            <div
                v-for="airport in airports"
                :key="airport.icao"
                class="procedures_airport"
                @click="mapStore.addAirportOverlay(airport.icao, { tab: 'procedures' })"
            >
                <div class="procedures_airport_name">
                    {{airport.icao}}
                </div>
                <div class="procedures_airport_line">
                    <div
                        v-if="airport.sids"
                        class="procedures_airport_line_item procedures_airport_line_item--sid"
                    />
                    <div
                        v-if="airport.stars"
                        class="procedures_airport_line_item procedures_airport_line_item--star"
                    />
                    <div
                        v-if="airport.approaches"
                        class="procedures_airport_line_item procedures_airport_line_item--approach"
                    />
                </div>
                <div
                    class="procedures_airport_delete"
                    @click.stop="[delete dataStore.navigraphProcedures[airport.icao], enroutePath && delete enroutePath[airport.icao]]"
                >
                    <close-icon/>
                </div>
            </div>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import { useMapStore } from '~/store/map';
import {
    enroutePath,
    updateCachedProcedures,
} from '~/composables/navigraph';

const dataStore = useDataStore();

interface Airport {
    icao: string;
    sids: boolean;
    stars: boolean;
    approaches: boolean;
}

const mapStore = useMapStore();

const airports = computed<Airport[]>(() => {
    const airports = Object.entries(dataStore.navigraphProcedures);
    const result: Airport[] = [];

    for (const [airport, data] of airports) {
        if (!data) continue;
        const { sids, stars, approaches } = data;

        const resultAirport = {
            icao: airport,
            sids: !!Object.keys(sids).length,
            stars: !!Object.keys(stars).length,
            approaches: !!Object.keys(approaches).length,
        };

        if (!resultAirport.sids && !resultAirport.stars && !resultAirport.approaches) continue;

        result.push(resultAirport);
    }

    return result;
});

function receiveMessage(event: MessageEvent) {
    if (event.origin !== config.public.DOMAIN) {
        return;
    }

    if (event.source === window) return; // the message is from the same window, so we ignore it

    if (event.data && 'proceduresUpdate' in event.data) {
        updateCachedProcedures();
    }
}

onMounted(() => {
    window.addEventListener('message', receiveMessage);
    updateCachedProcedures();
});

const config = useRuntimeConfig();

onBeforeUnmount(() => {
    window.removeEventListener('message', receiveMessage);
});
</script>

<style scoped lang="scss">
.procedures {
    scrollbar-width: none;

    position: absolute;
    z-index: 6;
    bottom: 12px;
    left: 64px;

    overflow: auto;
    display: flex;
    gap: 8px;

    max-width: calc(100% - 64px);

    @include mobileOnly {
        left: 16px + 32px + 8px;
    }

    &_airport {
        cursor: pointer;

        position: relative;

        overflow: hidden;
        display: flex;
        gap: 8px;
        align-items: center;

        min-width: max-content;
        height: 40px;
        padding: 8px 16px 12px;
        border: 1px solid varToRgba('lightgray125', 0.15);
        border-radius: 8px;

        font-size: 14px;
        font-weight: 600;

        background: $darkgray900;

        transition: 0.3s;

        @include mobileOnly {
            font-size: 13px;
        }

        @supports (width: calc-size(auto, size)) {
            width: calc-size(auto, size);
            min-width: calc-size(auto, max-content);

            &--appear {
                &-enter-active,
                &-leave-active {
                    transition: 0.3s ease-out;
                }

                &-enter-from,
                &-leave-to {
                    width: 0;
                    min-width: 0;
                    margin-right: -8px;
                    padding: 0;
                    border-width: 0;
                }
            }
        }

        @include hover {
            &:hover {
                background: $darkgray850;
            }
        }

        &_line {
            position: absolute;
            bottom: 0;
            left: 0;

            display: flex;

            width: 100%;

            &_item {
                width: 100%;
                height: 4px;
                border-radius: 2px;

                &--sid {
                    background: $info500;
                }

                &--star {
                    background: $success500;
                }

                &--approach {
                    background: $warning700;
                }
            }
        }

        &_delete {
            width: 12px;
            min-width: 12px;
            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $error500;
                }
            }

            @include mobileOnly {
                width: 12px;
                min-width: 12px;
            }
        }
    }
}
</style>
