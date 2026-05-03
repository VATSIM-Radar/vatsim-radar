<template>
    <div class="debug __info-sections">
        <map-filters-debug-clear
            v-if="isDebug"
            data="all"
            @click="[debugControllers = [], debugBookings = []]"
        >
            Clear All
        </map-filters-debug-clear>
        <ui-block-title remove-margin>
            Fake ATC
        </ui-block-title>
        <ui-button-group>
            <ui-button
                size="S"
                type="primary"
                @click="activeController = getDefaultController()"
            >
                Add New
            </ui-button>
            <map-filters-debug-clear
                data="controllers"
                type="primary"
                @click="debugControllers = []"
            />
        </ui-button-group>
        <div class="debug_atc">
            <div
                v-for="(controller, index) in debugControllers"
                :key="controller.cid+index"
                class="debug_atc_item"
            >
                <div class="debug_atc_item_title">
                    {{controller.callsign}}
                </div>
                <div class="debug_atc_item_actions">
                    <ui-button
                        icon-width="12px"
                        size="S"
                        :type="controller.visual_range === -1000 ? 'secondary' : 'primary'"
                        @click="setVisualRange(controller)"
                    >
                        <template #icon>
                            <check-icon/>
                        </template>
                    </ui-button>
                    <ui-button
                        icon-width="12px"
                        size="S"
                        @click="activeController = { default: false, ...controller }"
                    >
                        <template #icon>
                            <edit-icon/>
                        </template>
                    </ui-button>
                    <ui-button
                        hover-color="error700"
                        icon-width="12px"
                        primary-color="error500"
                        size="S"
                        @click="deleteController(controller.cid)"
                    >
                        <template #icon>
                            <close-icon/>
                        </template>
                    </ui-button>
                </div>
            </div>
        </div>
        <popup-fullscreen
            :model-value="!!activeController"
            @update:modelValue="activeController = null"
        >
            <template #title>
                Fake ATC edit
            </template>
            <map-filters-debug-controller
                v-if="activeController"
                v-model="activeController"
                @submit="!isDisabledControllerSave && saveController()"
            />
            <template #actions>
                <ui-button
                    type="secondary"
                    @click="activeController = null"
                >
                    Cancel
                </ui-button>
                <ui-button
                    :disabled="isDisabledControllerSave"
                    @click="saveController"
                >
                    Save
                </ui-button>
            </template>
        </popup-fullscreen>
        <ui-block-title remove-margin>
            Fake booking
        </ui-block-title>
        <ui-button-group>
            <ui-button
                size="S"
                type="primary"
                @click="activeBooking = getDefaultBooking()"
            >
                Add New
            </ui-button>
            <map-filters-debug-clear
                data="controllers"
                type="primary"
                @click="debugBookings = []"
            />
        </ui-button-group>
        <div class="debug_atc">
            <div
                v-for="(booking, index) in debugBookings"
                :key="booking.id+index"
                class="debug_atc_item"
            >
                <div class="debug_atc_item_title">
                    {{booking.atc.callsign}}
                </div>
                <div class="debug_atc_item_actions">
                    <ui-button
                        icon-width="12px"
                        size="S"
                        @click="activeBooking = { default: false, ...booking }"
                    >
                        <template #icon>
                            <edit-icon/>
                        </template>
                    </ui-button>
                    <ui-button
                        hover-color="error700"
                        icon-width="12px"
                        primary-color="error500"
                        size="S"
                        @click="deleteBooking(booking.atc.cid)"
                    >
                        <template #icon>
                            <close-icon/>
                        </template>
                    </ui-button>
                </div>
            </div>
        </div>
        <popup-fullscreen
            :model-value="!!activeBooking"
            width="600px"
            @update:modelValue="activeBooking = null"
        >
            <template #title>
                Fake booking edit
            </template>
            <map-filters-debug-booking
                v-if="activeBooking"
                v-model="activeBooking"
                @submit="!isDisabledBookingSave && saveBooking()"
            />
            <template #actions>
                <ui-button
                    type="secondary"
                    @click="activeBooking = null"
                >
                    Cancel
                </ui-button>
                <ui-button
                    :disabled="isDisabledBookingSave"
                    @click="saveBooking"
                >
                    Save
                </ui-button>
            </template>
        </popup-fullscreen>
        <ui-block-title remove-margin>
            Data
        </ui-block-title>
        <div
            v-if="isDebug"
            class="debug_data-container __info-sections"
        >
            <div
                v-for="key in ['vatspy', 'simaware', 'vatglasses'] as DataKey[]"
                :key
                class="debug_data __info-sections"
            >
                <div class="debug_data_title">
                    {{key}}
                </div>
                <div
                    v-if="key !== 'vatglasses'"
                    class="debug_data_pr __grid-info-sections"
                >
                    <div class="__grid-info-sections_title">
                        Get from PR
                    </div>
                    <div class="__section-group">
                        <ui-input-text
                            height="32px"
                            :model-value="typeof prs[key] === 'number' ? prs[key].toString() : null"
                            @update:modelValue="[!isNaN(Number($event)) && (prs[key] = Number($event))]"
                        >
                            PR ID
                        </ui-input-text>
                        <ui-button
                            class="debug__save-button"
                            :disabled="!prs[key] || prs[key] === 'loading'"
                            :hover-color="prs[key] === true ? 'success700' : undefined"
                            :primary-color="prs[key] === true ? 'success500' : undefined"
                            size="S"
                            @click="getFromPr(key)"
                        >
                            <template v-if="prs[key] === 'loading'">
                                Saving...
                            </template>
                            <template v-else-if="prs[key] !== true">
                                Save
                            </template>
                            <template v-else>
                                Saved!
                            </template>
                        </ui-button>
                    </div>
                </div>
                <div class="debug_data_upload __section-group">
                    <template v-if="key === 'vatspy'">
                        <map-filters-debug-upload
                            v-model="files.vatspy.dat"
                            accept=".dat"
                        >
                            VATSpy.dat
                        </map-filters-debug-upload>
                        <map-filters-debug-upload
                            v-model="files.vatspy.json"
                            accept=".geojson"
                        >
                            Boundaries.geojson
                        </map-filters-debug-upload>
                    </template>
                    <template v-else-if="key === 'simaware'">
                        <map-filters-debug-upload
                            v-model="files.simaware"
                            accept=".geojson"
                        >
                            TRACONBoundaries.geojson
                        </map-filters-debug-upload>
                    </template>
                    <template v-else-if="key === 'vatglasses'">
                        <map-filters-debug-upload
                            v-model="files.vatglasses"
                            accept=".zip"
                        >
                            repository.zip
                        </map-filters-debug-upload>
                    </template>
                </div>
                <div class="debug_data_upload __section-group">
                    <map-filters-debug-clear :data="key"/>
                    <ui-button
                        :disabled="isDisabledSave(key)"
                        size="S"
                        @click="send(key)"
                    >
                        Save
                    </ui-button>
                </div>
            </div>
        </div>
        <ui-notification
            v-else
            type="info"
        >
            VATSpy, SimAware and VATGlasses data debug is only supported in local setup
        </ui-notification>
        <ui-block-title remove-margin>
            Flight plan
        </ui-block-title>
        <div class="__section-group">
            <ui-input-text v-model="flightPlan.departure">
                Departure
            </ui-input-text>
            <ui-input-text v-model="flightPlan.arrival">
                Arrival
            </ui-input-text>
            <ui-input-text v-model="flightPlan.plan">
                Flight plan
            </ui-input-text>
        </div>
        <ui-button
            :disabled="!flightPlan.departure || !flightPlan.arrival || !flightPlan.plan"
            @click="parse"
        >
            Parse
        </ui-button>
        <ui-block-title remove-margin>
            Debug info
        </ui-block-title>
        <ul>
            <li
                v-for="(item, key) in store.bench"
                :key
            >
                {{key}}: {{item}}ms
            </li>
            <li>
                wsOpen: {{store.wsOpen}}
            </li>
            <li>
                wsCallsign: {{store.wsCallsign}}
            </li>
            <li>
                ownCallsign: {{ownFlight?.callsign}}
            </li>
            <li>
                ownGroundCoordinate: {{dataStore.vatsim.selfCoordinate.value}}
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { VatsimBooking, VatsimController } from '~/types/data/vatsim';
import MapFiltersDebugController from '~/components/map/settings/filters/MapFiltersDebugController.vue';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CloseIcon from '~/assets/icons/basic/close.svg?component';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import MapFiltersDebugClear from '~/components/map/settings/filters/MapFiltersDebugClear.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import MapFiltersDebugUpload from '~/components/map/settings/filters/MapFiltersDebugUpload.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import { debugBookings, debugControllers } from '~/composables/render/update/utils';
import { getFacilityByCallsign } from '~/utils/shared/vatsim';
import CheckIcon from '~/assets/icons/kit/check.svg?component';
import MapFiltersDebugBooking from '~/components/map/settings/filters/MapFiltersDebugBooking.vue';

const files = reactive({
    vatspy: {
        json: null as File | null,
        dat: null as File | null,
    },
    simaware: null as File | null,
    vatglasses: null as File | null,
});

const prs = reactive({
    vatspy: null as number | null | true | 'loading',
    simaware: null as number | null | true | 'loading',
});

const flightPlan = reactive({
    departure: '',
    arrival: '',
    plan: '',
});

const isDebug = useIsDebug();
const store = useStore();

export interface VatsimControllerWithField extends VatsimController {
    default: boolean;
}

export interface VatsimBookingWithField extends VatsimBooking {
    default: boolean;
}

const getDefaultController = (): VatsimControllerWithField => ({
    cid: Date.now(),
    name: Date.now().toString(),
    callsign: '',
    frequency: '123.123',
    facility: 3,
    rating: 2,
    server: 'AUTOMATIC',
    visual_range: 0,
    text_atis: ['ATIS'],
    last_updated: new Date().toISOString(),
    logon_time: new Date().toISOString(),
    default: true,
});

const getDefaultBooking = (): VatsimBookingWithField => {
    const start = new Date();
    const end = new Date();
    start.setMinutes(start.getMinutes() + 60);
    end.setMinutes((end.getMinutes() + 60) * 3);

    return {
        start: start.getTime(),
        end: end.getTime(),
        id: Date.now(),
        type: 'booking',
        atc: {
            callsign: '',
            cid: Date.now(),
            name: Date.now().toString(),
            frequency: '123.123',
            facility: 1,
            rating: -1,
            logon_time: '',
            text_atis: [],
            isBooking: true,
        },
        default: true,
    };
};

const dataStore = useDataStore();
const mapStore = useMapStore();

async function parse() {
    const mapCenter = mapStore.center;

    dataStore.navigraphWaypoints.value[1] = {
        // @ts-expect-error this data is ok enough
        pilot: {
            callsign: 'test',
            cid: 1,
            heading: 0,
            groundspeed: 0,
            arrival: flightPlan.arrival,
            departure: flightPlan.departure,
            longitude: mapCenter![0],
            latitude: mapCenter![1],
        },
        full: true,
        coordinates: [mapCenter![0], mapCenter![1]],
        waypoints: await getFlightPlanWaypoints({
            flightPlan: flightPlan.plan,
            departure: flightPlan.departure,
            arrival: flightPlan.arrival,
            cid: 1,
        }),
        arrived: false,
    };

    triggerRef(dataStore.navigraphWaypoints);
}

function setVisualRange(controller: VatsimController) {
    controller.visual_range = (controller.visual_range === -1000 ? 1 : -1000);
    triggerRef(debugControllers);
}

onMounted(() => {
    // @ts-expect-error debug only
    window.debugWaypoints = async (departure: string, arrival: string, flightPlan: string) => {
        const mapCenter = mapStore.center;

        console.log(await getFlightPlanWaypoints({
            flightPlan,
            departure,
            arrival,
            cid: 1,
        }));

        dataStore.navigraphWaypoints.value[1] = {
            // @ts-expect-error this data is ok enough
            pilot: {
                callsign: 'test',
                cid: 1,
                heading: 0,
                groundspeed: 0,
                arrival,
                departure,
                longitude: mapCenter![0],
                latitude: mapCenter![1],
            },
            full: true,
            coordinates: [mapCenter![0], mapCenter![1]],
            waypoints: await getFlightPlanWaypoints({
                flightPlan,
                departure,
                arrival,
                cid: 1,
            }),
            arrived: false,
        };

        triggerRef(dataStore.navigraphWaypoints);
        await nextTick();
        console.log(dataStore.navigraphWaypoints);
    };
});

const activeController = ref<VatsimControllerWithField | null>(null);

const isDisabledControllerSave = computed(() => !activeController.value ||
    !activeController.value.name ||
    !activeController.value.callsign ||
    debugControllers.value?.some(x => x.callsign === activeController.value!.callsign && x.cid !== activeController.value!.cid));

const saveController = async () => {
    debugControllers.value = debugControllers.value.filter(x => x.cid !== activeController.value!.cid);
    debugControllers.value.push({
        ...activeController.value!,
        facility: getFacilityByCallsign(activeController.value!.callsign),
        text_atis: activeController.value!.text_atis!.filter(x => !!x),
    });
    triggerRef(debugControllers);
    activeController.value = null;
};

const deleteController = async (cid: number) => {
    debugControllers.value = debugControllers.value.filter(x => x.cid !== cid);
};

const activeBooking = ref<VatsimBookingWithField | null>(null);

const isDisabledBookingSave = computed(() => !activeBooking.value ||
    !activeBooking.value.atc.name ||
    !activeBooking.value.atc.callsign ||
    debugBookings.value?.some(x => x.atc.callsign === activeBooking.value!.atc.callsign && x.atc.cid !== activeBooking.value!.atc.cid));

const saveBooking = async () => {
    debugBookings.value = debugBookings.value.filter(x => x.atc.callsign !== activeBooking.value!.atc.callsign);
    debugBookings.value.push({
        ...activeBooking.value!,
        atc: {
            ...activeBooking.value!.atc,
            facility: getFacilityByCallsign(activeBooking.value!.atc.callsign),
        },
    });
    triggerRef(debugBookings);
    activeBooking.value = null;
};

const deleteBooking = async (cid: number) => {
    debugBookings.value = debugBookings.value.filter(x => x.atc.cid !== cid);
};

const getFromPr = async (type: Exclude<DataKey, 'vatglasses'>) => {
    const id = prs[type];
    prs[type] = 'loading';
    try {
        await $fetch(`/api/data/debug/${ type }/${ id }/save`, {
            method: 'POST',
        });
        prs[type] = true;
        await sleep(2000);
        prs[type] = null;
    }
    catch (e) {
        console.error(e);
        prs[type] = null;
    }
};

type DataKey = 'vatspy' | 'simaware' | 'vatglasses';

const isDisabledSave = (key: DataKey) => {
    if (key === 'vatspy') return !files.vatspy.json || !files.vatspy.dat;
    return !files[key];
};

const send = async (key: DataKey) => {
    if (key === 'vatspy') {
        const formData = new FormData();
        formData.set('boundaries', files.vatspy.json!);
        formData.set('dat', files.vatspy.dat!);
        await $fetch('/api/data/custom/vatspy', {
            body: formData,
            method: 'POST',
        });
        files.vatspy = {
            json: null,
            dat: null,
        };
    }
    else {
        const formData = new FormData();
        formData.set('file', files[key]!);
        await $fetch(`/api/data/custom/${ key }`, {
            body: formData,
            method: 'POST',
        });

        files[key] = null;
    }

    alert(`${ key } has been saved`);
};
</script>

<style scoped lang="scss">
.debug {
    &_data {
        padding: 8px;
        border: 1px solid varToRgba('lightgray125', 0.1);
        border-radius: 8px;
        background: $darkgray950;

        &:first-child {
            grid-area: full;
        }

        &:nth-child(2) {
            grid-area: left;
        }

        &:last-child {
            grid-area: right;
        }

        &_title {
            font-weight: bold;
        }
    }

    &_atc {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        &_item {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: space-between;

            padding: 8px;
            border: 1px solid varToRgba('lightgray125', 0.1);
            border-radius: 4px;

            font-size: 14px;
            font-weight: 600;

            background: $darkgray950;

            &_actions {
                display: flex;
                gap: 8px;

                .button {
                    width: 24px;
                    height: 24px;
                    min-height: unset;
                }
            }
        }
    }

    &__save-button {
        align-self: flex-end;
    }
}
</style>
