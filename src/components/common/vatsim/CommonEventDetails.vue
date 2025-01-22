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

                    <common-button-group class="event-details__routes_route_actions">
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
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import type { VatsimEvent } from '~/types/data/vatsim';
import { parse } from 'marked';

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const { copy: baseCopy } = useCopyText();

const app = useNuxtApp();
const description = computed(() => parse(props.event.description));

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
.event-details {
    padding: 8px;
    font-size: 14px;

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
</style>
