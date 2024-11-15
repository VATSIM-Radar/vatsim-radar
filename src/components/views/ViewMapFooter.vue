<template>
    <footer
        v-if="dataStore.vatsim.updateTimestamp.value"
        class="map-footer"
    >
        <div class="map-footer_left">
            <div
                v-if="dataStore.versions.value?.navigraph"
                class="map-footer_left_section"
                title="Navigraph Data AIRAC"
                @click="!store.user?.hasFms ? airacPopup = true : undefined"
            >
                <div
                    class="map-footer__airac"
                    :class="{ 'map-footer__airac--current': !!store.user?.hasFms }"
                >
                    <img
                        alt="Navigraph"
                        src="@/assets/icons/header/navigraph.svg"
                        width="20"
                    >

                    AIRAC {{
                        dataStore.versions.value.navigraph[store.user?.hasFms ? 'current' : 'outdated'].split('-')[0]
                    }}
                </div>
            </div>
            <div class="map-footer_left_section __from-tablet">
                <common-button
                    size="S"
                    :type="store.featuredAirportsOpen ? 'primary' : 'secondary'"
                    @click="store.featuredAirportsOpen = !store.featuredAirportsOpen"
                >
                    Featured Airports
                </common-button>

                <common-control-block
                    v-model="store.featuredAirportsOpen"
                    center-by="start"
                    max-height="400px"
                    width="480px"
                >
                    <template #title>
                        Featured Airports
                    </template>

                    <map-featured-airports/>
                </common-control-block>
            </div>
            <div class="map-footer_left_section __desktop">
                <div class="map-footer__connections">
                    <div class="map-footer__connections_title">
                        <span>{{ getCounts.total }}</span> connections
                    </div>
                    <div class="map-footer__connections_title">
                        <span>{{ getCounts.inRadar }}</span> in VATSIM Radar
                    </div>
                    <div class="map-footer__connections_info">
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.pilots }}</span> pilots
                        </div>
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.firs + getCounts.atc }}</span> atc
                        </div>
                        <div
                            v-if="getCounts.sups"
                            class="map-footer__connections_info_item"
                        >
                            <span>{{ getCounts.sups }}</span>
                            <template v-if="getCounts.sups > 1">
                                supervisors
                            </template>
                            <template v-else>
                                supervisor
                            </template>
                        </div>
                        <div
                            v-if="getCounts.adm"
                            class="map-footer__connections_info_item"
                        >
                            <span>{{ getCounts.adm }}</span>
                            <template v-if="getCounts.adm > 1">
                                admins
                            </template>
                            <template v-else>
                                admin
                            </template>
                        </div>
                    </div>
                </div>
            </div>
            <div
                v-if="store.version"
                class="map-footer_left_section map-footer__text"
            >
                v{{ store.version }}
            </div>
        </div>
        <div
            v-if="getCounts.lastUpdated"
            class="map-footer_right __from-tablet"
            :class="{ 'map-footer_right--outdated': outdated }"
        >
            Map last updated: {{ getCounts.lastUpdated }}
        </div>
    </footer>
    <common-popup v-model="airacPopup">
        <template #title>
            AIRAC upgrade
        </template>
        You can upgrade your AIRAC to access latest data for gates, runways and more in the future, by purchasing and linking a Navigraph subscription.
        <template #actions>
            <common-button
                v-if="!store.user || store.user?.hasFms === null"
                href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
                icon-width="25px"
                target="_blank"
                type="secondary"
            >
                <template #icon>
                    <img
                        alt="Navigraph"
                        src="@/assets/icons/header/navigraph.svg"
                    >
                </template>
                Subscription Options
            </common-button>
            <common-button
                v-else
                type="secondary"
                @click="airacPopup = false"
            >
                Cancel
            </common-button>
            <common-button
                v-if="store.user?.hasFms === null"
                href="/api/auth/navigraph/redirect"
            >
                Link Navigraph
            </common-button>
            <common-button
                v-else-if="store.user?.hasFms === false"
                href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
                icon-width="25px"
                target="_blank"
            >
                <template #icon>
                    <img
                        alt="Navigraph"
                        src="@/assets/icons/header/navigraph.svg"
                    >
                </template>
                Subscription Options
            </common-button>
            <common-button
                v-else
                href="/api/auth/vatsim/redirect"
            >
                Login
            </common-button>
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import { useOnlineCounters } from '~/composables/navigation';
import MapFeaturedAirports from '~/components/map/MapFeaturedAirports.vue';

const store = useStore();
const dataStore = useDataStore();
const airacPopup = ref(false);

const getCounts = useOnlineCounters();

const outdated = computed(() => dataStore.time.value - dataStore.vatsim.updateTime.value > 1000 * 20);
</script>

<style scoped lang="scss">
.map-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 24px;

    font-size: 13px;

    &_left {
        display: flex;

        &_section {
            position: relative;
            display: flex;
            align-items: center;

            &:not(:last-child) {
                margin-right: 12px;
                padding-right: 12px;

                &::after {
                    content: '';

                    position: absolute;
                    left: 100%;

                    align-self: center;

                    height: 24px;

                    border-right: 1px solid varToRgba('lightgray150', 0.1);
                }
            }
        }
    }

    &__airac, &__connections {
        padding: 8px 12px;
        background: $darkgray950;
        border-radius: 8px;
    }

    &__airac {
        cursor: pointer;

        display: flex;
        gap: 8px;
        align-items: center;

        font-weight: 600;

        &--current {
            cursor: default;
            color: $lightgray125;
            background: linear-gradient(90deg, rgba(184, 42, 20, 0.25) 0%, $darkgray950 75%);
        }
    }

    &__connections {
        display: flex;

        span {
            font-weight: 600;
            color: $primary500;
        }

        &_title {
            margin-right: 8px;
            padding-right: 8px;
            border-right: 1px solid varToRgba('lightgray150', 0.2);
        }

        &_info {
            display: flex;
            gap: 8px;
            align-items: center;
            font-weight: 300;

            &_item:not(:last-child) {
                padding-right: 8px;
                border-right: 1px solid varToRgba('lightgray150', 0.2);
            }
        }
    }

    &_right {
        padding: 8px 16px;

        font-weight: 300;

        background: $darkgray950;
        border-radius: 8px;

        transition: 0.3s;

        &--outdated {
            color: $lightgray100Orig;
            background: $error600;
        }
    }

    &__text {
        color: $lightgray150;
        text-decoration-skip-ink: none;
        opacity: 0.5;
    }
}
</style>
