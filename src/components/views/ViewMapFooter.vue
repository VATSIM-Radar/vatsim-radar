<template>
    <footer class="map-footer" v-if="dataStore.vatsim.updateTimestamp.value">
        <div class="map-footer_left">
            <div class="map-footer_left_section map-footer__airac" v-if="dataStore.versions.value?.navigraph" title="Navigraph Data AIRAC">
                AIRAC {{
                    dataStore.versions.value.navigraph[store.user?.hasFms ? 'current' : 'outdated'].split('-')[0]
                }}
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
                        <div class="map-footer__connections_info_item" v-if="getCounts.sups">
                            <span>{{ getCounts.sups }}</span>
                            <template v-if="getCounts.sups > 1">
                                supervisors
                            </template>
                            <template v-else>
                                supervisor
                            </template>
                        </div>
                        <div class="map-footer__connections_info_item" v-if="getCounts.adm">
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
            <nuxt-link to="/privacy-policy" class="map-footer_left_section map-footer__text">
                Privacy Policy
            </nuxt-link>
            <div class="map-footer_left_section map-footer__text" v-if="store.version">
                v{{ store.version }}
            </div>
        </div>
        <div class="map-footer_right" v-if="getLastUpdated">
            Vatsim data time: {{ getLastUpdated }}
        </div>
    </footer>
</template>

<script setup lang="ts">
import { useStore } from '~/store';

const store = useStore();
const dataStore = useDataStore();

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
    padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;

    &_left {
        display: flex;

        &_section {
            display: flex;
            align-items: center;
            position: relative;

            //TODO: refactor to mixin
            &:not(:last-child) {
                margin-right: 12px;
                padding-right: 12px;

                &::after {
                    content: '';
                    position: absolute;
                    align-self: center;
                    left: 100%;
                    height: 24px;
                    border-right: 1px solid varToRgba('neutral150', 0.1);
                }
            }
        }
    }

    &__connections {
        display: flex;
        background: $neutral950;
        border-radius: 8px;
        padding: 8px 16px;

        span {
            color: $primary500;
            font-weight: 600;
        }

        &_title {
            margin-right: 8px;
            padding-right: 8px;
            border-right: 1px solid varToRgba('neutral150', 0.2);
        }

        &_info {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 300;

            &_item:not(:last-child) {
                padding-right: 8px;
                border-right: 1px solid varToRgba('neutral150', 0.2);
            }
        }
    }

    &_right {
        background: $neutral950;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 300;
    }

    &__text {
        color: $neutral150;
        opacity: 0.5;
        text-decoration-skip-ink: none;
    }
}
</style>
