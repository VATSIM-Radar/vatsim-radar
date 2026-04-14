<template>
    <div class="runways-container">
        <ui-notification
            cookie-name="vatglasses-runways"
            type="info"
        >
            In this block you can select active runway config<br> for VatGlasses sectors
        </ui-notification>
        <div
            v-if="airport?.vgRunways?.length"
            class="runways"
        >
            <div
                v-for="runway in getRunways"
                :key="runway.key"
                class="runways_runway"
                :class="{ 'runways_runway--active': runway.active }"
                @click="setActiveRunway(runway.key)"
            >
                <div
                    v-for="number in runway.runways"
                    :key="number"
                    class="runways_runway_number"
                >
                    {{ number }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiNotification from '~/components/ui/data/UiNotification.vue';
import { runwaysState } from '~/composables/render/update/vatglasses';

const props = defineProps({
    airport: {
        type: String,
        required: true,
    },
});

interface Runway {
    key: string;
    active: boolean;
    runways: string[];
}

const dataStore = useDataStore();

const airport = computed(() => dataStore.airportsList.value[props.airport]);

function setActiveRunway(runway: string) {
    runwaysState.value = {
        ...runwaysState.value,
        [props.airport]: runway,
    };
}

const getRunways = computed<Runway[]>(() => {
    if (!airport.value?.vgRunways) return [];

    return airport.value.vgRunways.map(runway => {
        return {
            key: runway,
            active: airport.value.activeRunway === runway,
            runways: runway.split(',').map(x => x.trim()),
        };
    });
});
</script>

<style scoped lang="scss">
.runways-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.runways {
    --background: #{$darkgray800};
    display: flex;
    gap: 8px;

    &_runway {
        cursor: pointer;

        position: relative;

        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;

        min-width: 64px;
        padding: 4px 8px;
        border: 1px solid transparent;
        border-radius: 8px;

        background: var(--background);

        transition: 0.3s;

        &::before {
            content: '';
            position: absolute;
            width: 100%;
            border: 1px dashed varToRgba('lightgray150', 0.5);
        }

        @include hover {
            &:hover {
                border-color: $primary300;
            }
        }

        &--active {
            cursor: default;
            border-color: $primary500 !important;
        }

        &_number {
            position: relative;
            z-index: 1;

            padding: 4px;


            font-size: 14px;
            font-weight: 600;
            color: $lightgray0;

            background: var(--background);
        }
    }
}
</style>
