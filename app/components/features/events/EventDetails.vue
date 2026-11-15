<template>
    <ui-text
        class="event-details"
        type="caption"
    >
        <div class="detail-item">
            <ui-text class="detail-item_header" type="2b">
                Description:
            </ui-text>
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

        <p>More details:                 <a
            :href="props.event.link"
            target="_blank"
        >on vatsim.net</a>
        </p>
    </ui-text>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import type { VatsimBooking, VatsimEvent } from '~/types/data/vatsim';
import { parse, Renderer } from 'marked';
import UiText from '~/components/ui/text/UiText.vue';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const timeZone = computed(() => !getKeyedValueFromSettings('appearance.dataLocalTimezone') ? 'UTC' : undefined);

const formatterTime = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: getKeyedValueFromSettings('appearance.timeFormat') === '12h' ? 'h12' : 'h23',
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

const renderer = new Renderer();
const renderLink = renderer.link;

renderer.link = function(token) {
    return renderLink.call(this, token).replace(
        '<a ',
        '<a target="_blank" rel="noopener noreferrer" ',
    );
};

const description = computed(() => parse(props.event.description, { renderer }));
</script>

<style scoped lang="scss">
.event-details {
    display: flex;
    flex-direction: column;
    gap: 4px;

    :deep(a) {
        color: $white;
        @include hover {
            transition: 0.3s;

            &:hover {
                color: $blue500;
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
            background: $darkGray400;

            &_airports {
                display: flex;
                gap: 4px;
                align-items: center;
                margin-bottom: 8px;

                span:not(:nth-child(2)) {
                    padding: 4px;
                    border-radius: 4px;
                    background: $darkGray700;
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

            background: $darkGray600;

            @include hover {
                transition: 0.3s;

                &:hover {
                    background: $darkGray500;
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

.detail-item_content {
    padding: 8px;
    border-radius: 8px;
    background: $darkGray600;
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
            background: $darkGray400;
        }
    }
}
</style>
