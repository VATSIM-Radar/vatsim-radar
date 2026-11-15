<template>
    <ui-page-container class="events" container>
        <template #title>
            <template v-if="isPast">
                Past Events
            </template>
            <template v-else>
                Events
            </template>
        </template>

        <div class="events__header">
            <ui-button-goto
                v-if="data?.pastEvents.length"
                class="events__goto"
                :to="isPast ? '/events' : '/events/past'"
            >
                <template v-if="isPast">
                    Current and upcoming events
                </template>
                <template v-else>
                    Past events
                </template>
            </ui-button-goto>
            <div
                ref="colorCodes"
                class="events_color-codes"
                :class="{ 'events_color-codes--open': !collapsedLegend }"
            >
                <ui-button
                    class="events_color-codes_btn"
                    disable-text-decoration
                    type="link"
                    @click="collapsedLegend = !collapsedLegend"
                >
                    Event colour codes

                    <template #append>
                        <arrow-top-icon class="events_color-codes_btn_icon" width="8"/>
                    </template>
                </ui-button>
                <ui-text class="events_color-codes__menu" type="1b">
                    <div class="events_color-codes__menu_color __events-cpt">
                        Controller Practical Test
                    </div>
                    <div class="events_color-codes__menu_color __events-single">
                        Single vACC
                    </div>
                    <div class="events_color-codes__menu_color __events-multiple">
                        Multi vACC
                    </div>
                    <div class="events_color-codes__menu_event-highlight">
                        Active event
                    </div>
                </ui-text>
            </div>
        </div>

        <template #append>
            <client-only>
                <div class="events_time">
                    <ui-text class="events_time_primary" type="h4">
                        {{eventsLocalTimezone ? currentTime : utcTime}}
                    </ui-text>
                </div>
            </client-only>
        </template>

        <client-only>
            <div class="events_list">
                <template
                    v-for="(events, day) in groupedEventData"
                    :key="day+String(!eventsLocalTimezone)"
                >
                    <ui-text class="common-event__title" type="h3">{{ getDate(events![0].start_time) }}</ui-text>

                    <event-card
                        v-for="event in events"
                        :key="event.id"
                        class="common-event"
                        :event
                    />
                </template>
            </div>
        </client-only>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import EventCard from '~/components/features/events/EventCard.vue';
import type { VatsimEventData } from '~~/server/api/data/vatsim/events';
import type { VatsimEventShort } from '~/types/data/vatsim';
import UiText from '~/components/ui/text/UiText.vue';
import UiButtonGoto from '~/components/ui/buttons/UiButtonGoto.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';

const { data, refresh } = await useAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
}, {
    server: false,
});

const colorCodes = useTemplateRef('colorCodes');
const route = useRoute();
const eventsLocalTimezone = useSettingValueFromFunc('appearance.dataLocalTimezone');
const timeZone = computed(() => !eventsLocalTimezone.value ? 'UTC' : undefined);

const isPast = computed(() => route.path.endsWith('/past'));
const collapsedLegend = ref(true);

const datetime = computed(() => new Intl.DateTimeFormat(['ru-RU', 'de-DE', 'en-GB', 'en-US'], {
    localeMatcher: 'best fit',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: timeZone.value,
}));

const weekday = computed(() => new Intl.DateTimeFormat(['en-US'], {
    weekday: 'long',
    timeZone: timeZone.value,
}));

function getDate(_date: string) {
    const date = new Date(_date);

    return `${ weekday.value.format(date) }, ${ datetime.value.format(date) }`;
}

const currentDate = ref(Date.now());

let interval: NodeJS.Timeout | undefined;
let checkInterval: NodeJS.Timeout | undefined;

const utcTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const currentTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const utcTime = computed(() => `${ utcTimeFormatter.format(currentDate.value) }z`);
const currentTime = computed(() => currentTimeFormatter.format(currentDate.value));

onMounted(() => {
    interval = setInterval(() => {
        currentDate.value = Date.now();
    }, 1000);

    checkInterval = setInterval(() => {
        refresh();
    }, 1000 * 60 * 5);
});

onBeforeUnmount(() => {
    clearInterval(interval);
    clearInterval(checkInterval);
});

const groupedEventData = computed(() => {
    const events: Record<number, VatsimEventShort[]> = {};

    data.value?.[!isPast.value ? 'events' : 'pastEvents'].forEach(event => {
        if (!isPast.value && new Date(event.end_time).getTime() < currentDate.value) return;
        const date = new Date(event.start_time);
        const key = !eventsLocalTimezone.value
            ? parseInt(date.getUTCFullYear().toString() + `0${ date.getUTCMonth() }`.slice(-2) + `0${ date.getUTCDate() }`.slice(-2))
            : parseInt(date.getFullYear().toString() + `0${ date.getMonth() }`.slice(-2) + `0${ date.getDate() }`.slice(-2));

        events[key] ??= [];
        events[key].push(event);
    });

    return events;
});

useClickOutside({
    element: colorCodes,
    callback: () => {
        collapsedLegend.value = true;
    },
});
</script>

<style scoped lang="scss">
.common-event__title {
    margin-bottom: 4px !important;
    color: $blue500;
    text-transform: none;

    &:not(:first-child) {
        margin-top: 24px;
    }
}

.events {
    :deep(.common-event) {
        margin-bottom: 4px;
    }

    :deep(.page-block_container) {
        .__events-cpt {
            --color: #{$red500};
        }

        .__events-single {
            --color: #{$green500};
        }

        .__events-multiple {
            --color: #{$purple500};
        }
    }

    &_time {
        text-align: right;

        & &_primary {
            margin-bottom: 8px;
            color: $white;
            text-transform: none;
        }

        & &_secondary {
            color: $typographySecondary;
        }

        & >*{
            font-family: $robotoFont;
            font-variant-numeric: tabular-nums;
        }
    }

    &__header {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: space-between;

        margin-bottom: 24px;
    }

    &_color-codes {
        position: relative;

        &_btn {
            &_icon {
                transform: rotate(90deg);
                transition: 0.3s;
            }
        }

        &__menu {
            position: absolute;
            top: 100%;
            right: 0;

            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;

            max-width: 80dvw;
            padding: 16px;

            white-space: nowrap;

            visibility: hidden;
            opacity: 0;
            background: $darkGray800;

            transition: 0.3s;

            &_color {
                display: flex;
                align-items: center;

                &::after {
                    content: '';

                    display: block;

                    width: 12px;
                    height: 12px;
                    margin-left: 16px;
                    border-radius: 100%;

                    background: var(--color);
                }
            }

            &_event-highlight {
                padding: 8px;
                border: 1px solid $brandPrimary;
                border-radius: 4px;
                background: $darkGray700;
            }
        }

        &--open {
            .events_color-codes_btn_icon {
                transform: rotate(180deg);
            }

            .events_color-codes__menu {
                top: calc(100% + 8px);
                visibility: visible;
                opacity: 1;
            }
        }
    }
}
</style>
