<template>
    <footer
        v-if="dataStore.vatsim.updateTimestamp.value"
        class="map-footer"
    >
        <div class="map-footer_left">
            <div
                v-if="dataStore.versions.value?.navigraph && (!isMobile || mapStore.isNavigraphUpdating)"
                class="map-footer_left_section"
                title="Navigraph Data AIRAC"
                @click="!store.user?.hasFms ? store.airacPopup = true : undefined"
            >
                <navigation-airac/>
            </div>
            <div class="map-footer_left_section __from-tablet">
                <ui-button
                    size="S"
                    :type="store.featuredAirportsOpen ? 'primary' : 'secondary'"
                    @click="[store.featuredAirportsOpen = !store.featuredAirportsOpen, store.menuFriendsOpen = false]"
                >
                    Featured Airports
                </ui-button>

                <popup-aside
                    v-model="store.featuredAirportsOpen"
                    center-by="start"
                    width="480px"
                >
                    <template #title>
                        Featured Airports
                    </template>

                    <map-featured-airports/>
                </popup-aside>
            </div>

            <div
                v-if="(store.friends.length || store.bookmarks.length) &&  store.viewport.width > 1000"
                class="map-footer_left_section"
            >
                <ui-button
                    size="S"
                    :type="store.menuFriendsOpen ? 'primary' : 'secondary'"
                    @click="[store.menuFriendsOpen = !store.menuFriendsOpen, store.featuredAirportsOpen = false]"
                >
                    <template #icon>
                        <ui-bubble>
                            {{ store.friends.length }}
                        </ui-bubble>
                    </template>

                    Favorite
                </ui-button>

                <popup-aside
                    v-model="store.menuFriendsOpen"
                    center-by="start"
                    max-height="370px"
                    width="480px"
                >
                    <template #title>
                        <div class="map-footer__favorite">
                            <span>Favorite</span>

                            <ui-button
                                size="S"
                                type="secondary"
                                @click="[store.settingsPopup = true, store.settingsPopupTab = 'favorite']"
                            >
                                Manage friends
                            </ui-button>
                            <ui-toggle
                                v-if="store.bookmarks.length"
                                :model-value="!!store.localSettings.featuredDefaultBookmarks"
                                @update:modelValue="setUserLocalSettings({ featuredDefaultBookmarks: $event })"
                            >
                                Default to bookmarks
                            </ui-toggle>
                        </div>
                    </template>

                    <navigation-favorite/>
                </popup-aside>
            </div>
            <div class="map-footer_left_section __desktop">
                <ui-text
                    class="map-footer__connections"
                    type="3b"
                >
                    <div class="map-footer__connections_title">
                        <span>{{ getCounts.total }}</span> connections with <span>{{ getCounts.inRadar }}</span> in VATSIM Radar
                    </div>
                    <div class="map-footer__connections_info">
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.pilots }}</span> pilots
                        </div>
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.controllers }}</span> ATC
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
                </ui-text>
            </div>
        </div>
        <div class="map-footer_right">
            <quick-settings-vat-glasses-level
                v-if="store.viewport.width > (store.friends.length ? 1200 : 1000)"
                class="map-footer_right_vg map-footer_right_section __from-tablet"
                show-auto
            />

            <div v-if="store.bookingOverride">
                <ui-button
                    primary-color="error700"
                    size="S"
                    type="primary"
                    @click="cancelBookingOverride"
                >
                    Cancel Booking Override
                </ui-button>
            </div>
            <div class="map-footer_right_section __desktop">
                <ui-button
                    size="S"
                    :type="store.mapBookingOpen ? 'primary' : 'secondary'"
                    @click="store.mapBookingOpen = !store.mapBookingOpen"
                >
                    <template #icon>
                        <svg
                            fill="none"
                            viewBox="0 0 24 24"
                            width="16"
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
                </ui-button>
                <popup-aside
                    v-model="store.mapBookingOpen"
                    center-by-offset="-40px"
                    class="map-footer__booking"
                    width="700px"
                >
                    <template #title>
                        <div class="map-footer__booking-title-row">
                            <span>Bookings</span>
                            <ui-toggle
                                v-model="store.mapSettings.bookingsLocalTimezone"
                                class="picker-localtime"
                                @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
                            >
                                local time
                            </ui-toggle>
                        </div>
                    </template>
                    <map-popup-footer-booking/>
                </popup-aside>
            </div>

            <ui-text
                v-if="store.version && (!isMobile || !mapStore.isNavigraphUpdating)"
                class="map-footer__text"
                color="lightGray900"
                type="3b"
            >
                v{{ store.version }}
            </ui-text>

            <ui-separator distance="0"/>

            <ui-text
                v-if="getCounts.lastUpdated"
                class="map-footer_right_date"
                :class="{ 'map-footer_right_date--outdated': outdated }"
                type="3b"
            >
                Map last update: <ui-text
                    tag="span"
                    type="caption-medium-alt"
                >{{ getCounts.lastUpdated }}</ui-text>
            </ui-text>
        </div>
    </footer>
    <popup-fullscreen
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
                Navigational Data AIRAC upgrade
            </li>
        </ul>
        <template #actions>
            <ui-button
                v-if="!store.user || store.user?.hasFms === null"
                href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
                icon-width="25px"
                target="_blank"
                type="secondary"
            >
                <template #icon>
                    <img
                        alt="Navigraph"
                        src="../../../assets/icons/header/navigraph.svg"
                    >
                </template>
                Subscription Options
            </ui-button>
            <ui-button
                v-else
                type="secondary"
                @click="store.airacPopup = false"
            >
                Cancel
            </ui-button>
            <ui-button
                v-if="store.user?.hasFms === null"
                href="/api/auth/navigraph/redirect"
            >
                Connect Navigraph
            </ui-button>
            <ui-button
                v-else-if="store.user?.hasFms === false"
                href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
                icon-width="25px"
                target="_blank"
            >
                <template #icon>
                    <img
                        alt="Navigraph"
                        src="../../../assets/icons/header/navigraph.svg"
                    >
                </template>
                Subscription Options
            </ui-button>
            <ui-button
                v-else
                href="/api/auth/vatsim/redirect"
            >
                Connect
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import PopupAside from '~/components/popups/PopupAside.vue';
import { useOnlineCounters } from '~/composables/map';
import MapFeaturedAirports from '~/components/map/MapFeaturedAirports.vue';
import NavigationAirac from '~/components/features/navigation/NavigationAirac.vue';
import QuickSettingsVatGlassesLevel from '~/components/map/settings/quick-settings/QuickSettingsVatGlassesLevel.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import NavigationFavorite from '~/components/features/navigation/NavigationFavorite.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import MapPopupFooterBooking from '~/components/map/MapFooterBooking.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();

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

            &--version {
                display: flex;
                gap: 4px;
                align-items: center;
                white-space: nowrap;
            }

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
        gap: 8px;
        align-items: center;

        span {
            font-family: $robotoFont;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: $brandPrimary;
        }

        &_info {
            display: flex;
            gap: 1px;
            align-items: center;

            &_item {
                display: flex;
                gap: 4px;
                align-items: center;

                padding: 8px;

                background: $backgroundLevel1;

                &:first-child {
                    border-top-left-radius: 4px;
                    border-bottom-left-radius: 4px;
                }

                &:last-child {
                    border-top-right-radius: 4px;
                    border-bottom-right-radius: 4px;
                }
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
                padding-right: 8px;

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
            :deep(.input) {
                height: 32px !important;
            }
        }

        &_date {
            display: flex;
            gap: 8px;
            align-items: center;
            color: $typographyPrimary;

            &--outdated span {
                color: $lightgray100Orig;
                background: $error600;
            }

            span {
                display: flex;
                align-items: center;

                height: 20px;
                padding: 0 6px;

                font-family: $robotoFont;
                font-variant-numeric: tabular-nums;

                background: $backgroundLevel4;
            }
        }
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
