<template>
    <div
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
                <div class="event-details__description_image">
                    <img
                        v-if="props.event.banner"
                        :src="props.event.banner"
                    >
                </div>
            </div>
        </div>

        <div
            v-if="props.event.airports?.length > 0"
            class="detail-item"
        >
            <div class="detail-item_header">
                Airports:
            </div>
            <div class="detail-item_content event-details__airports-links">
                <ui-button
                    v-for="airport in props.event.airports"
                    :key="airport.icao"
                    :href="`/?airport=${ airport.icao }`"
                    :target="app.$pwa?.isPWAInstalled ? undefined : '_blank'"
                    type="link"
                >
                    {{airport.icao}}
                </ui-button>
            </div>
        </div>
        <div
            v-if="props.event.routes?.length > 0"
            class="detail-item"
        >
            <div class="detail-item_header">
                Routes:
            </div>
            <div class="detail-item_content event-details__routes">
                <div
                    v-for="route in props.event.routes"
                    :key="route.departure + route.arrival + route.route"
                    class="event-details__routes_route"
                >
                    <div class="event-details__routes_route_airports">
                        <span @click="baseCopy(route.departure)">{{ route.departure }}</span>
                        <span @click="baseCopy(route.route)">{{ route.route }}</span>
                        <span @click="baseCopy(route.arrival)">{{ route.arrival }}</span>
                    </div>

                    <ui-button-group class="event-details__routes_route_actions">
                        <ui-button
                            :href="encodeURI(`https://my.vatsim.net/pilots/flightplan?departure=${ route.departure }&arrival=${ route.arrival }&route=${ route.route }`)"
                            target="_blank"
                        >
                            Prefile on VATSIM
                        </ui-button>
                        <ui-button
                            :href="encodeURI(`https://dispatch.simbrief.com/options/custom?orig=${ route.departure }&dest=${ route.arrival }&route=${ route.route }`)"
                            target="_blank"
                        >
                            Prefile on SimBrief
                        </ui-button>
                        <ui-button @click="baseCopy(`${ route.departure } ${ route.route } ${ route.arrival }`)">
                            Copy Route
                        </ui-button>
                    </ui-button-group>
                </div>
            </div>
        </div>

        <div
            v-if="bookings?.data?.value && Object.values(bookings?.data.value ?? {}).some(x => x.length)"
            class="detail-item"
        >
            <div class="detail-item_header">
                Bookings:
            </div>
            <div class="detail-item_content event-details__bookings">
                <template
                    v-for="(list, airport) in bookings.data.value"
                    :key="airport"
                >
                    <a
                        v-for="booking in list"
                        :key="booking.id"
                        class="event-details__bookings_booking"
                        :href="`https://stats.vatsim.net/stats/${ booking.atc.cid }`"
                        target="_blank"
                    >
                        <div class="event-details__bookings_booking_callsign">
                            {{booking.atc.callsign}} (<span @click.prevent>{{booking.atc.cid}}</span>)
                        </div>
                        <div class="event-details__bookings_booking_date">
                            From {{formatterTime.format(booking.start)}}{{timeZone === 'UTC' ? 'z' : ''}} to {{formatterTime.format(booking.end)}}{{timeZone === 'UTC' ? 'z' : ' local'}}
                        </div>
                    </a>
                </template>
            </div>
        </div>

        <div
            v-if="organisers"
            class="detail-item"
        >
            <div class="detail-item_header">
                Organisers:
            </div>
            <div class="detail-item_content detail-item__organisers">
                <div
                    v-for="(organiser, region) in organisers"
                    :key="region"
                    class="detail-item__organisers_item"
                >
                    <div
                        v-if="region !== 'VATSIM' && region !== 'default' && Object.keys(organisers).length > 1"
                        class="detail-item__organisers_item_region"
                    >
                        {{region}}:
                    </div>
                    <div
                        v-for="(item, index) in organiser"
                        :key="item + index"
                        class="detail-item__organisers_item_text"
                    >
                        {{item}}
                    </div>
                </div>
            </div>
        </div>

        <p>More details:                 <a
            :href="props.event.link"
            target="_blank"
        >on vatsim.net</a>
        </p>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import type { VatsimBooking, VatsimEvent } from '~/types/data/vatsim';
import { parse } from 'marked';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const store = useStore();

const timeZone = computed(() => store.mapSettings.bookingsLocalTimezone ? 'UTC' : undefined);

const formatterTime = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone.value,
}));

const start = computed(() => new Date(props.event.start_time).getTime());
const end = computed(() => new Date(props.event.end_time).getTime());

const bookings = await useLazyAsyncData<Record<string, VatsimBooking[]>>(computed(() => `event-${ props.event.id }-bookings`), async () => {
    return Object.fromEntries(await Promise.all((props.event.airports ?? [])
        .map(async ({ icao }) => (
            [
                icao,
                (await $fetch<{ bookings: VatsimBooking[] }>(`/api/data/vatsim/airport/${ icao }?requestedDataType=2`).catch(e => {
                    console.error(e);
                    return { bookings: [] };
                })).bookings.filter(x => x.start >= start.value && x.end <= end.value),
            ]
        ))));
}, {
    watch: [() => props.event],
});

const { copy: baseCopy } = useCopyText();

const app = useNuxtApp();
const description = computed(() => parse(props.event.description));

const organisers = computed(() => {
    if (props.event.organisers?.length) {
        const organisers: Record<string, string[]> = {};

        props.event.organisers.forEach(o => {
            if (o.organised_by_vatsim) {
                return organisers.vatsim = ['VATSIM'];
            }
            else {
                organisers[o.region ?? 'default'] ??= [];
                organisers[o.region ?? 'default'].push(o.subdivision ? `${ o.division } / ${ o.subdivision }` : String(o.division));
            }
        });

        return organisers;
    }
    return null;
});
</script>

<style scoped lang="scss">
.event-details {
    padding: 8px;
    font-size: 14px;


    :deep(a) {
        color: $primary500;
        @include hover {
            transition: 0.3s;

            &:hover {
                color: $primary300;
            }
        }
    }

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
                max-width: 100%;
                border-radius: 16px;
            }
        }

        &_image {
            --width: 30%;
            width: var(--width);
            min-width: var(--width);

            @include mobileOnly {
                --width: 100%;
            }

            @include tablet {
                --width: 40%;
            }
        }
    }

    &__routes {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 100%;

        &_route {
            padding: 8px;
            border-radius: 8px;
            background: $darkgray800;

            &_airports {
                display: flex;
                gap: 4px;
                align-items: center;
                margin-bottom: 8px;

                span:not(:nth-child(2)) {
                    padding: 4px;
                    border-radius: 4px;
                    background: $darkgray900;
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

    & &__bookings {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        padding: 0;

        background: transparent;

        &_booking {
            padding: 8px;
            border-radius: 8px;

            color: currentColor;
            text-decoration: none;

            background: $darkgray875;

            @include hover {
                transition: 0.3s;

                &:hover {
                    background: $darkgray850;
                }
            }

            &_callsign {
                font-weight: 600;

                span {
                    user-select: all;
                }
            }

            &_date {
                font-size: 12px;
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
    border-radius: 8px;
    background: $darkgray875;
    @include mobile {
        overflow: auto;
        max-height: 25vh;
    }
}

.detail-item__organisers {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_item {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;

        &_region {
            margin-right: 4px;
            font-weight: 600;
        }

        &_text {
            padding: 4px;
            border-radius: 4px;
            background: $darkgray800;
        }
    }
}
</style>
