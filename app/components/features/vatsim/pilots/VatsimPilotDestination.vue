<template>
    <div
        v-if="pilot.departure && pilot.arrival"
        class="destination_wrap"
    >
        <div class="destination">
            <div class="destination_airport">
                <ui-text
                    class="destination_airport_title"
                    type="3b-medium"
                >
                    {{pilot.departure}}
                </ui-text>
                <ui-text
                    v-if="!short && depAirport"
                    class="destination_airport_text"
                    type="caption-light"
                >
                    {{depAirport.name}}
                </ui-text>
            </div>

            <div
                class="destination_icon"
                :class="{ 'destination_icon--svg': !!svg }"
            >
                <span
                    v-if="svg"
                    v-html="reColorSvg(svg, 'neutral')"
                />
                <aircraft-icon v-else/>
            </div>

            <div class="destination_airport">
                <ui-text
                    class="destination_airport_title"
                    type="3b-medium"
                >
                    {{pilot.arrival}}
                </ui-text>
                <ui-text
                    v-if="!short && arrAirport"
                    class="destination_airport_text"
                    type="caption-light"
                >
                    {{arrAirport.name}}
                </ui-text>
            </div>
        </div>
        <ui-data-list-item
            v-if="pilot.diverted"
            class='destination_diverted'
        >
            <template #title>
                Diverted from {{pilot.diverted_origin}}
            </template>

            {{divOrgAirport?.name}}
        </ui-data-list-item>
    </div>
</template>

<script setup lang="ts">
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import AircraftIcon from '~/assets/icons/kit/aircraft.svg?component';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { fetchAircraftIcon } from '~/composables/vatsim/pilots';

const props = defineProps({
    pilot: {
        type: Object as PropType<Partial<VatsimShortenedAircraft> & Pick<VatsimShortenedAircraft, 'arrival' | 'departure'>>,
        required: true,
    },
    short: {
        type: Boolean,
        default: false,
    },
});

const dataStore = useDataStore();

const svg = shallowRef<string | null>(null);

const depAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.departure ?? ''] ?? null);
const arrAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.arrival ?? ''] ?? null);
const divOrgAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.diverted_origin ?? ''] ?? null);

onMounted(() => {
    watch(() => props.pilot.aircraft_short, async val => {
        if (!val) {
            svg.value = null;
            return;
        }

        const icon = getAircraftIcon(props.pilot);
        if (!icon) return;

        svg.value = await fetchAircraftIcon(icon.icon);
    }, {
        immediate: true,
    });
});
</script>

<style scoped lang="scss">
.destination {
    position: relative;

    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: center;

    &_airport {
        display: flex;
        flex-direction: column;
        gap: 4px;

        width: 100%;

        overflow-wrap: anywhere;

        &:last-child {
            align-items: flex-end;
            text-align: right;
        }
    }

    &_icon {
        position: absolute;

        span :deep(svg) {
            transform: rotate(90deg);
            width: 20px;
        }
    }

    &_diverted {
        color: $divertedBackground !important;
    }

    &_wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
    }
}
</style>
