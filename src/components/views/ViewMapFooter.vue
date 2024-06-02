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
                    AIRAC {{
                        dataStore.versions.value.navigraph[store.user?.hasFms ? 'current' : 'outdated'].split('-')[0]
                    }}
                </div>
            </div>
            <div class="map-footer_left_section">
                <div class="map-footer__connections">
                    <div class="map-footer__connections_title">
                        <span>{{ getCounts.total }}</span> total connections
                    </div>
                    <div class="map-footer__connections_info">
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.pilots }}</span> pilots
                        </div>
                        <div class="map-footer__connections_info_item">
                            <span>{{ getCounts.firs }}</span> sector /
                            <span>{{ getCounts.atc }}</span> local atc
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
            <nuxt-link
                class="map-footer_left_section map-footer__text"
                no-prefetch
                to="/privacy-policy"
            >
                Privacy Policy
            </nuxt-link>
            <div
                v-if="store.version"
                class="map-footer_left_section map-footer__text"
            >
                v{{ store.version }}
            </div>
        </div>
        <div
            v-if="getLastUpdated"
            class="map-footer_right"
        >
            VATSIM data time: {{ getLastUpdated }}
        </div>
    </footer>
    <common-popup v-model="airacPopup">
        <template #title>
            AIRAC upgrade
        </template>
        You can upgrade your AIRAC to access latest data for gates, runways and more in future, by purchasing and linking Navigraph subscription.
        <template #actions>
            <common-button
                v-if="!store.user || store.user?.hasFms === null"
                href="https://navigraph.com/pricing"
                target="_blank"
                type="secondary"
            >
                More about subscription
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
                Connect Navigraph
            </common-button>
            <common-button
                v-else-if="store.user?.hasFms === false"
                href="https://navigraph.com/pricing"
                target="_blank"
            >
                Purchase subscription
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

const store = useStore();
const dataStore = useDataStore();
const airacPopup = ref(false);

const datetime = new Intl.DateTimeFormat([], {
    timeZone: 'UTC',
    localeMatcher: 'best fit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

const getCounts = computed(() => {
    const [atc, atis] = dataStore.vatsim.data.locals.value.reduce((acc, atc) => {
        atc.isATIS ? acc[0]++ : acc[1]++;
        return acc;
    }, [0, 0]);

    return {
        total: dataStore.vatsim.data.general.value?.unique_users,
        firs: dataStore.vatsim.data.firs.value.length,
        atc,
        atis,
        pilots: dataStore.vatsim.data.pilots.value.length,
        sups: dataStore.vatsim.data.general.value?.supsCount,
        adm: dataStore.vatsim.data.general.value?.admCount,
    };
});

const getLastUpdated = computed(() => {
    const updateTimestamp = dataStore.vatsim.data.general.value?.update_timestamp;
    if (!updateTimestamp) return null;

    const date = new Date(updateTimestamp);

    return `${ datetime.format(date) } Z`;
});
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

                    border-right: 1px solid varToRgba('neutral150', 0.1);
                }
            }
        }
    }

    &__airac, &__connections {
        padding: 8px 16px;
        background: $neutral950;
        border-radius: 8px;
    }

    &__airac {
        cursor: pointer;

        &--current {
            cursor: default;
            background: varToRgba('primary500', 0.1);
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
            border-right: 1px solid varToRgba('neutral150', 0.2);
        }

        &_info {
            display: flex;
            gap: 8px;
            align-items: center;
            font-weight: 300;

            &_item:not(:last-child) {
                padding-right: 8px;
                border-right: 1px solid varToRgba('neutral150', 0.2);
            }
        }
    }

    &_right {
        padding: 8px 16px;
        font-weight: 300;
        background: $neutral950;
        border-radius: 8px;
    }

    &__text {
        color: $neutral150;
        text-decoration-skip-ink: none;
        opacity: 0.5;
    }
}
</style>
