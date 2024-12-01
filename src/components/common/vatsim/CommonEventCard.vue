<template>
    <div>
        <div
            class="event-card"
            :class="{ 'event-card_active': active }"
            @click="details = !details"
        >
            <div class="event-card_start">
                <client-only>
                    {{ formattedStart }} - {{ formattedEnd }}
                </client-only>
            </div>
            <div class="event-card_name">
                {{ props.event.name }} <span
                    v-if="active"
                    class="event-card_name_active"
                >Now active!</span>
            </div>
            <div class="event-card_airports">
                {{ props.event.airports.map((a) => a.icao).join(", ") }}
            </div>
        </div>
        <div
            v-if="details"
            class="event-details"
        >
            <div class="detail-item">
                <div class="detail-item_header">
                    Description:
                </div>
                <div
                    class="detail-item_content event-details__description"
                    :class="{ 'event-details__description--has-banner': props.event.banner }"
                >
                    <div v-html="description"/>
                    <img
                        v-if="props.event.banner"
                        :src="props.event.banner"
                    >
                </div>
            </div>

            <div
                v-if="props.event.airports?.length > 0"
                class="detail-item"
            >
                <div class="detail-item_header">
                    Airports:
                </div>
                <div class="detail-item_content event-card__airports-links">
                    <common-button
                        v-for="airport in props.event.airports"
                        :key="airport.icao"
                        :href="`/?airport=${ airport.icao }`"
                        :target="app.$pwa?.isPWAInstalled ? undefined : '_blank'"
                        type="link"
                    >
                        {{airport.icao}}
                    </common-button>
                </div>
            </div>
            <div
                v-if="props.event.routes?.length > 0"
                class="detail-item"
            >
                <div class="detail-item_header">
                    Routes:
                </div>
                <div class="detail-item_content event-card__routes">
                    <div
                        v-for="route in props.event.routes"
                        :key="route.departure + route.arrival + route.route"
                        class="event-card__routes_route"
                    >
                        <div class="event-card__routes_route_airports">
                            <span @click="baseCopy(route.departure)">{{ route.departure }}</span>
                            <span @click="baseCopy(route.route)">{{ route.route }}</span>
                            <span @click="baseCopy(route.arrival)">{{ route.arrival }}</span>
                        </div>

                        <common-button-group class="event-card__routes_route_actions">
                            <common-button
                                :href="encodeURI(`https://my.vatsim.net/pilots/flightplan?departure=${ route.departure }&arrival=${ route.arrival }&route=${ route.route }`)"
                                target="_blank"
                            >
                                Prefile on VATSIM
                            </common-button>
                            <common-button
                                :href="encodeURI(`https://dispatch.simbrief.com/options/custom?orig=${ route.departure }&dest=${ route.arrival }&route=${ route.route }`)"
                                target="_blank"
                            >
                                Prefile on SimBrief
                            </common-button>
                            <common-button @click="baseCopy(`${ route.departure } ${ route.route } ${ route.arrival }`)">
                                Copy Route
                            </common-button>
                        </common-button-group>
                    </div>
                </div>
            </div>

            <div
                v-if="organisers"
                class="detail-item"
            >
                <div class="detail-item_header">
                    Organisers:
                </div>
                <div class="detail-item_content">
                    {{ organisers }}
                </div>
            </div>

            <p>More details:                 <a
                :href="props.event.link"
                target="_blank"
            >on vatsim.net</a>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { VatsimEvent } from '~/types/data/vatsim';
import { parse } from 'marked';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const details = ref(false);

const formatter = new Intl.DateTimeFormat(['en-DE'], {
    hour: '2-digit',
    minute: '2-digit',
});

const formatterWithDate = new Intl.DateTimeFormat(['de-DE'], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const { copy: baseCopy } = useCopyText();

const app = useNuxtApp();
const description = computed(() => parse(props.event.description));
const formattedStart = computed(() => formatter.format(new Date(props.event.start_time)));
const formattedEnd = computed(() => {
    const date = new Date(props.event.end_time);

    if (date.getDate() !== new Date(props.event.start_time).getDate()) return formatterWithDate.format(date);

    return formatter.format(date);
});
const active = computed(() => new Date(props.event.start_time) < new Date());
const organisers = computed(() => {
    if (props.event.organisers?.length) {
        const o = props.event.organisers[0];
        if (o.organised_by_vatsim) {
            return 'VATSIM';
        }
        else {
            return `${ o.region } / ${ o.division }`;
        }
    }
    return null;
});
</script>

<style scoped lang="scss">
.event-card {
    cursor: pointer;

    display: grid;
    grid-template-columns: 200px 600px auto 50px;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;

    min-height: 52px;
    padding: 8px;

    font-size: 14px;

    background: $darkgray900;
    border-radius: 4px;

    transition: 0.3s;

    @include mobile {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    @include hover {
        &:hover {
            background: $darkgray875;
        }
    }

    &_name {
        font-size: 14px;
        font-weight: 600;
    }

    &_active {
        border: 2px solid $info300;
    }

    &_name_active {
        color: $info300;
    }

    &__routes {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 100%;

        &_route {
            padding: 8px;
            background: $darkgray800;
            border-radius: 8px;

            &_airports {
                display: flex;
                gap: 4px;
                align-items: center;
                margin-bottom: 8px;

                span:not(:nth-child(2)) {
                    padding: 4px;
                    background: $darkgray900;
                    border-radius: 4px;
                }

                span {
                    cursor: pointer;
                }
            }

            @include fromTablet {
                &_actions {
                    min-width: 500px;
                }
            }
        }
    }

    &__airports-links {
        display: flex;
        gap: 4px;

        .button {
            font-size: 14px !important;
        }
    }
}

.event-details {
    margin: 0 20px;
    padding: 8px;

    font-size: 14px;

    background: $darkgray900;
    border: 2px solid $darkgray800;
    border-top: 0;
    border-radius: 4px;

    @include mobileOnly {
        margin: 0;
    }

    &__description {
        &--has-banner {
            display: flex;
            gap: 16px;
            align-items: flex-start;

            @include mobileOnly {
                flex-direction: column;

                img{
                    order: 1;
                }

                div {
                    order: 2;
                }
            }

            img {
                max-width: 30%;
                border-radius: 16px;

                @include mobileOnly {
                    max-width: 100%;
                }

                @include tablet {
                    max-width: 40%;
                }
            }
        }
    }
}

.detail-item {
    display: grid;
    grid-template-columns: 200px auto;
    gap: 8px;
    align-items: flex-start;
    justify-content: flex-start;

    margin-bottom: 12px;

    @include mobile {
        display: flex;
        flex-direction: column;
    }
}

.detail-item_header {
    font-size: 14px;
    font-weight: 600;
}

.detail-item_content {
    padding: 8px;
    background: $darkgray875;
    @include mobile {
        overflow: auto;
        max-height: 25vh;
    }
}
</style>
