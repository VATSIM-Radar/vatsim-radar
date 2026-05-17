<template>
    <ui-text class="user-status" type="3b">
        <div v-if="user.type !== 'offline'" class="user-status_text">
            <template v-if="user.type === 'pilot'">
                <template v-if="user.data.departure || user.data.airport">
                    <template v-if="user.data.status === 'depGate' || user.data.status === 'depTaxi'">
                        Departing from <a :href="`/?airport=${ user.data.departure ?? user.data.airport }`" @click.prevent="openAirport(user.data.departure ?? user.data.airport!)">{{ user.data.departure ?? user.data.airport }}</a>
                    </template>
                    <template v-else-if="user.data.status === 'arrGate' || user.data.status === 'arrTaxi'">
                        Arrived to <a :href="`/?airport=${ user.data.arrival }`" @click.prevent="openAirport(user.data.arrival!)">{{ user.data.arrival }}</a>
                    </template>
                    <template v-else-if="user.data.status === 'departed'">
                        Departed from <a :href="`/?airport=${ user.data.departure ?? user.data.airport }`" @click.prevent="openAirport(user.data.departure ?? user.data.airport!)">{{ user.data.departure ?? user.data.airport }}</a>
                    </template>
                    <template v-else-if="user.data.status === 'arriving'">
                        Arriving to <a :href="`/?airport=${ user.data.arrival }`" @click.prevent="openAirport(user.data.arrival!)">{{ user.data.arrival }}</a>
                    </template>
                    <template v-else-if="!user.data.departure || !user.data.arrival">
                        Flying
                    </template>
                    <template v-else>
                        Flying from <a :href="`/?airport=${ user.data.departure }`" @click.prevent="openAirport(user.data.departure!)">{{ user.data.departure }}</a> to <a :href="`/?airport=${ user.data.arrival }`" @click.prevent="openAirport(user.data.arrival!)">{{ user.data.arrival }}</a>
                    </template>
                    as <a :href="`/?pilot=${ user.data.cid }`" @click.prevent="openPilot(user.data.cid!)">{{ user.data.callsign }}</a>
                </template>
                <template v-else>
                    <a :href="`/?pilot=${ user.data.cid }`" @click.prevent="openPilot(user.data.cid!)">{{ user.data.callsign }}</a>
                </template>
                <template v-if="user.sharedPilots.length">
                    together with {{user.sharedPilots.map(x => x.name).join(', ')}}
                </template>
            </template>
            <template v-else-if="user.type === 'prefile'">
                Preparing for a flight <template v-if="user.data.departure">
                    from <a :href="`/?airport=${ user.data.departure }`" @click.prevent="openAirport(user.data.departure!)">{{ user.data.departure }}</a> to <a :href="`/?airport=${ user.data.arrival }`" @click.prevent="openAirport(user.data.arrival!)">{{ user.data.arrival }}</a>
                </template> as {{ user.data.callsign }}
            </template>
            <template v-else-if="user.type === 'atc'">
                Controlling as <a :href="`/?atc=${ user.data.cid }`" @click.prevent="openATC(user.data.cid!)">{{ user.data.callsign }}</a>
            </template>
            <template v-else-if="user.type === 'booking'">
                Booked {{user.data.atc.callsign}} from {{ makeBookingTime(user.data.start) }}z to {{makeBookingTime(user.data.end)}}z
            </template>
            <template v-else-if="user.type === 'sup'" @click.stop>
                SUPing as {{ user.data.callsign }}
            </template>
        </div>
        <div
            v-if="user.suping && user.type !== 'sup'"
            class="user-status_text"
        >
            SUPing as {{ user.suping }}
        </div>
    </ui-text>
</template>

<script setup lang="ts">
import type { UserListLiveUser } from '~/utils/server/handlers/lists';
import { showPilotOnMap } from '~/composables/vatsim/pilots';
import { makeBookingTime } from '~/composables/vatsim/bookings';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    user: {
        type: Object as PropType<UserListLiveUser>,
        required: true,
    },
});

const store = useStore();
const mapStore = useMapStore();
const map = inject<ShallowRef<Map | null>>('map');
const dataStore = useDataStore();

function openAirport(icao: string) {
    if (map?.value) {
        mapStore.addAirportOverlay(icao);

        if (dataStore.vatspy.value?.data.keyAirports.realIcao[icao]) {
            showAirportOnMap(dataStore.vatspy.value?.data.keyAirports.realIcao[icao], map.value);
        }
    }
    else {
        window.open(`/?airport=${ icao }`);
    }
}

function openPilot(cid: number) {
    if (map?.value) {
        mapStore.addPilotOverlay(cid);

        if (dataStore.vatsim.data.keyedPilots.value[cid.toString()]) {
            showPilotOnMap(dataStore.vatsim.data.keyedPilots.value[cid.toString()], map.value);
        }
    }
    else {
        window.open(`/?pilot=${ cid }`);
    }
}

function openATC(cid: number) {
    if (map?.value) {
        mapStore.addAtcOverlay(cid.toString());

        const controller = dataStore.vatsim.data.controllers.value.find(x => x.cid === cid);

        if (controller) {
            showAtcOnMap(controller, map.value);
        }
    }
    else {
        window.open(`/?atc=${ cid }`);
    }
}
</script>


