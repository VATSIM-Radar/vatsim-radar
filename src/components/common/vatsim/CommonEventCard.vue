<template>
    <div>
        <div
            class="event-card"
            :class="{ 'event-card--active': active }"
            @click="details = !details"
        >
            <div class="event-card_start">
                {{ formattedStart }}Z - {{ formattedEnd }}Z
            </div>
            <div class="event-card_start">
                {{ props.event.organisers[0]?.region }} -> {{ props.event.organisers[0]?.division }}
            </div>
            <div class="event-card_name">
                {{ props.event.name }} <span
                    v-if="active"
                    class="active"
                >Now active!</span>
            </div>
            <div class="event-airports">
                {{ props.event.airports.map((a) => a.icao).join(", ") }}
            </div>
        </div>
        <div
            v-if="details"
            class="event-details"
        >
            <div class="detail-item">
                <div class="detail-item-header">
                    Description:
                </div>
                <div class="detail-item-content">
                    {{ props.event.description }}
                </div>
            </div>

            <div
                v-if="props.event.airports?.length > 0"
                class="detail-item"
            >
                <div class="detail-item-header">
                    Airports:
                </div>
                <div class="detail-item-content">
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
                <div class="detail-item-header">
                    Routes:
                </div>
                <div class="detail-item-content">
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

    background: $darkgray900;
    border-radius: 4px;

    transition: 0.3s;
    font-size: 14px;

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

.active-event {
  border: 2px solid $info300;
}

.active {
  color: $info300;
}

.event-details {
  background: $darkgray900;
  margin: 0 20px 0 20px;
  border-left: 2px solid $darkgray800;
  border-right: 2px solid $darkgray800;
  border-bottom: 2px solid $darkgray800;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
}

.detail-item {
  display: grid;
  grid-template-columns: 200px auto;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.detail-item-header {
  font-size: 14px;
  font-weight: 600;
}

.airport {
  padding-right: 5px;
}

.detail-item-content {
  background: $darkgray875;
  padding: 8px;
}

.departure {
  font-weight: 700;
}

.arrival {
  font-weight: 700;
}
</style>
