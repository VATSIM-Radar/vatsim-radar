<template>
    <div>
        <div
            class="event-card"
            :class="{ 'event-card_active': active }"
            @click="details = !details"
        >
            <div class="event-card_start">
                {{ formattedStart }}Z - {{ formattedEnd }}Z
            </div>
            <div class="event-card_start">
                {{ organisers }}
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
                <div class="detail-item_content">
                    {{ props.event.description }}
                </div>
            </div>

            <div
                v-if="props.event.airports?.length > 0"
                class="detail-item"
            >
                <div class="detail-item_header">
                    Airports:
                </div>
                <div class="detail-item_content">
                    <span
                        v-for="airport in props.event.airports"
                        :key="airport.icao"
                        class="airport"
                    >{{airport.icao}}</span>
                </div>
            </div>
            <div
                v-if="props.event.routes?.length > 0"
                class="detail-item"
            >
                <div class="detail-item_header">
                    Routes:
                </div>
                <div class="detail-item_content">
                    <span
                        v-for="route in props.event.routes"
                        :key="route.departure + route.arrival + route.route"
                    ><span class="departure">{{route.departure}}</span> {{ route.route }} <span class="arrival">{{ route.arrival }}</span><br></span>
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

const props = defineProps({
    event: {
        type: Object as PropType<VatsimEvent>,
        required: true,
    },
});

const details = ref(false);

const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const formattedStart = computed(() => formatter.format(new Date(props.event.start_time)));
const formattedEnd = computed(() => formatter.format(new Date(props.event.end_time)));
const active = computed(() => new Date(props.event.start_time) < new Date());
const organisers = computed(() => {
    if (props.event.organisers?.length) {
        const o = props.event.organisers[0];
        if (o.organised_by_vatsim) {
            return 'VATSIM';
        }
        else {
            return `${ o.region } -> ${ o.division }`;
        }
    }
    return null;
});
</script>

<style scoped lang="scss">
.event-card {
    cursor: pointer;

    display: grid;
    grid-template-columns: 200px 120px 600px auto 50px;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;

    min-height: 52px;
    padding: 8px;

    font-size: 14px;

    background: $darkgray900;
    border-radius: 4px;

    transition: 0.3s;

    @include hover {
        &:hover {
            background: $darkgray875;
        }
    }

    &_name {
        font-size: 14px;
        font-weight: 600;
    }
}

.event-card_active {
    border: 2px solid $info300;
}

.event-card_name_active {
    color: $info300;
}

.event-details {
    margin: 0 20px;
    padding: 8px;

    font-size: 14px;

    background: $darkgray900;
    border: 2px solid $darkgray800;
    border-top: 0;
    border-radius: 4px;
}

.detail-item {
    display: grid;
    grid-template-columns: 200px auto;
    gap: 8px;
    align-items: flex-start;
    justify-content: flex-start;

    margin-bottom: 12px;
}

.detail-item_header {
    font-size: 14px;
    font-weight: 600;
}

.airport {
    padding-right: 5px;
}

.detail-item_content {
    padding: 8px;
    background: $darkgray875;
}

.departure {
    font-weight: 700;
}

.arrival {
    font-weight: 700;
}
</style>
