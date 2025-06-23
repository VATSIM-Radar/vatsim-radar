<template>
    <footer
        v-if="dataStore.vatsim.updateTimestamp.value"
        class="map-footer"
    >
        <div class="map-footer_left">
            <div
                v-if="dataStore.versions.value?.navigraph && !isMobile"
                class="map-footer_left_section"
                title="Navigraph Data AIRAC"
                @click="!store.user?.hasFms ? store.airacPopup = true : undefined"
            >
                <common-airac/>
            </div>
            <div class="map-footer_left_section __from-tablet">
                <common-button
                    size="S"
                    :type="store.featuredAirportsOpen ? 'primary' : 'secondary'"
                    @click="[store.featuredAirportsOpen = !store.featuredAirportsOpen, store.menuFriendsOpen = false]"
                >
                    Featured Airports
                </common-button>

                <common-control-block
                    v-model="store.featuredAirportsOpen"
                    center-by="start"
                    width="480px"
                >
                    <template #title>
                        Featured Airports
                    </template>

                    <map-featured-airports/>
                </common-control-block>
            </div>

            <div
                v-if="(store.friends.length || store.bookmarks.length) &&  store.viewport.width > 1000"
                class="map-footer_left_section"
            >
                <common-button
                    size="S"
                    :type="store.menuFriendsOpen ? 'primary' : 'secondary'"
                    @click="[store.menuFriendsOpen = !store.menuFriendsOpen, store.featuredAirportsOpen = false]"
                >
                    <template #icon>
                        <common-bubble>
                            {{ store.friends.length }}
                        </common-bubble>
                    </template>

                    Favorite
                </common-button>

                <common-control-block
                    v-model="store.menuFriendsOpen"
                    center-by="start"
                    max-height="370px"
                    width="480px"
                >
                    <template #title>
                        <div class="map-footer__favorite">
                            <span>Favorite</span>

                            <common-button
                                size="S"
                                type="secondary"
                                @click="[store.settingsPopup = true, store.settingsPopupTab = 'favorite']"
                            >
                                Manage friends
                            </common-button>
                            <common-toggle
                                v-if="store.bookmarks.length"
                                :model-value="!!store.localSettings.featuredDefaultBookmarks"
                                @update:modelValue="setUserLocalSettings({ featuredDefaultBookmarks: $event })"
                            >
                                Default to bookmarks
                            </common-toggle>
                        </div>
                    </template>

                    <view-favorite/>
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
                            <span>{{ getCounts.firs + getCounts.atc }}</span> ATC
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
        <div class="map-footer_right">
            <map-settings-vat-glasses-level
                v-if="store.viewport.width > (store.friends.length ? 1200 : 1000)"
                class="map-footer_right_vg"
                show-auto
            />

            <div v-if="store.bookingOverride">
                <common-button
                    primary-color="error700"
                    size="S"
                    type="primary"
                    @click="cancelBookingOverride"
                >
                    Cancel Booking Override
                </common-button>
            </div>
            <div class="map-footer_right_section __from-tablet">
                <common-button
                    :type="store.mapBookingOpen ? 'primary' : 'secondary'"
                    @click="store.mapBookingOpen = !store.mapBookingOpen"
                >
                    <template #icon>
                        <svg
                            fill="none"
                            height="20"
                            viewBox="0 0 24 24"
                            width="20"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                            <path
                                d="M12 7v5l3 3"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-width="2"
                            />
                        </svg>
                    </template>
                </common-button>
                <common-control-block
                    center-by-offset="-40px"
                    class="map-footer__booking"
                    v-model:="store.mapBookingOpen"
                    width="700px"
                >
                    <template #title>
                        <div class="map-footer__booking-title-row">
                            <span>Bookings</span>
                            <common-toggle
                                v-model="store.mapSettings.bookingsLocalTimezone"
                                class="picker-localtime"
                                @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
                            >
                                local time
                            </common-toggle>
                        </div>
                    </template>
                    <map-popup-footer-booking/>
                </common-control-block>
            </div>

            <div
                v-if="getCounts.lastUpdated"
                class="map-footer_right_date"
                :class="{ 'map-footer_right_date--outdated': outdated }"
            >
                Map last updated: {{ getCounts.lastUpdated }}
            </div>
        </div>
    </footer>
    <common-popup
        v-model="store.airacPopup"
        width="600px"
    >
        <template #title>
            Connect Navigraph
        </template>
        Connect Navigraph for:

        <ul>
            <li>
                Better data for gates and runways
            </li>
            <li>
                Airport Layouts (Navigraph Unlimited only)
            </li>
            <li>
                Airways/waypoints AIRAC upgrade (coming soon)
            </li>
        </ul>
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
                @click="store.airacPopup = false"
            >
                Cancel
            </common-button>
            <common-button
                v-if="store.user?.hasFms === null"
                href="/api/auth/navigraph/redirect"
            >
                Connect Navigraph
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
                Connect
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
import CommonAirac from '~/components/common/vatsim/CommonAirac.vue';
import MapSettingsVatGlassesLevel from '~/components/map/filters/settings/MapSettingsVatGlassesLevel.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import ViewFavorite from '~/components/views/ViewFavorite.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import MapPopupFooterBooking from '~/components/map/MapFooterBooking.vue';

const store = useStore();
const dataStore = useDataStore();

const getCounts = useOnlineCounters();
const curDate = ref(Date.now());

const route = useRoute();
const router = useRouter();

const outdated = computed(() => {
    return (curDate.value - dataStore.vatsim.localUpdateTime.value) > 1000 * 60;
});
const isMobile = useIsMobile();

onMounted(() => {
    const interval = setInterval(() => {
        curDate.value = Date.now();
    }, 1000);

    onBeforeUnmount(() => {
        clearInterval(interval);
    });
});

function cancelBookingOverride() {
    store.bookingOverride = false;
    store.mapBookingOpen = false;
    delete route.query.start;
    delete route.query.end;
    router.replace({ query: route.query });
}
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

    &__connections {
        display: flex;
        padding: 8px 12px;
        border-radius: 8px;
        background: $darkgray950;

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
        display: flex;
        gap: 8px;
        align-items: center;

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

        &_vg {
            min-width: 320px;

            :deep(.input) {
                height: 32px !important;
            }
        }

        &_date {
            padding: 8px 16px;
            border-radius: 8px;

            font-weight: 300;
            font-variant-numeric: tabular-nums;

            background: $darkgray950;

            transition: 0.3s;

            &--outdated {
                color: $lightgray100Orig;
                background: $error600;
            }
        }
    }

    &__text {
        color: $lightgray150;
        text-decoration-skip-ink: none;
        opacity: 0.5;
    }

    &__favorite {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    &__booking {
        z-index: 10; // need that so the popup is above the scale lin of the map
    }
}

.map-footer__booking-title-row {
    display: flex;
    flex-direction: row;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    width: 600px;
}
</style>
