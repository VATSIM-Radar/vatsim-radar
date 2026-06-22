<template>
    <popup-fullscreen
        v-model="model"
        class="dashboard-edit-popup"
        :disabled="saving"
        width="700px"
    >
        <template #title>
            {{ isEdit ? 'Edit Dashboard' : 'Create Dashboard' }}
        </template>

        <div class="dashboard-edit">
            <div class="dashboard-edit_top">
                <ui-input-text
                    v-model="payload.name"
                    :error="!!payload.name && !nameValid"
                    :max="50"
                    placeholder="Dashboard name"
                >
                    Name
                </ui-input-text>
                <ui-toggle v-model="payload.public">
                    Public
                    <template #description>
                        Public dashboards are shareable via a direct link.
                    </template>
                </ui-toggle>
            </div>

            <div class="dashboard-edit_cols">
                <div class="dashboard-edit_col">
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Display options
                        </div>

                        <ui-toggle v-model="payload.json.showMetar">
                            Show METAR window
                        </ui-toggle>
                        <ui-toggle v-model="payload.json.showArrivalTracks">
                            Show Arrival Tracks
                        </ui-toggle>

                        <ui-select
                            :items="columnItems"
                            :model-value="payload.json.openColumns"
                            multiple
                            placeholder="Select columns"
                            width="100%"
                            @update:modelValue="payload.json.openColumns = $event as DashboardColumn[]"
                        >
                            Open columns by default
                        </ui-select>
                    </div>
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Airports
                        </div>

                        <vue-draggable
                            v-model="payload.json.airports"
                            class="dashboard-edit_airports"
                            handle=".dashboard-edit_airport_drag"
                        >
                            <div
                                v-for="(airport, index) in payload.json.airports"
                                :key="index"
                                class="dashboard-edit_airport"
                            >
                                <div class="dashboard-edit_airport_head">
                                    <ui-input-text
                                        :error="!!airportErrors[index]"
                                        height="36px"
                                        :model-value="airport.icao"
                                        placeholder="ICAO"
                                        @update:modelValue="airport.icao = ($event ?? '').toUpperCase().slice(0, 4)"
                                    />
                                    <div
                                        v-if="payload.json.airports.length > 1"
                                        class="dashboard-edit_airport_remove"
                                        @click="removeAirport(index)"
                                    >
                                        <close-icon/>
                                    </div>
                                    <drag-icon class="dashboard-edit_airport_drag"/>
                                </div>

                                <div
                                    v-if="airportErrors[index]"
                                    class="dashboard-edit_error"
                                >
                                    {{ airportErrors[index] }}
                                </div>

                                <ui-toggle
                                    :model-value="airport.showInTrafficPrediction"
                                    @update:modelValue="airport.showInTrafficPrediction = $event"
                                >
                                    Show in Traffic Prediction
                                </ui-toggle>

                                <ui-input-color
                                    color-only
                                    :model-value="hexToColorModel(airport.aircraftColor)"
                                    @update:modelValue="airport.aircraftColor = colorModelToHex($event)"
                                >
                                    Aircraft color
                                </ui-input-color>
                            </div>
                        </vue-draggable>

                        <ui-button
                            :disabled="atAirportCap"
                            size="S"
                            type="secondary"
                            @click="addAirport()"
                        >
                            <template #icon>
                                <plus-icon/>
                            </template>
                            Add airport
                        </ui-button>
                        <div
                            v-if="atAirportCap"
                            class="dashboard-edit_hint"
                        >
                            Maximum of {{ MAX_DASHBOARD_AIRPORTS }} airports reached.
                        </div>
                    </div>
                </div>

                <div class="dashboard-edit_col">
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Map
                        </div>

                        <div class="dashboard-edit_field">
                            <div class="dashboard-edit_field_label">
                                Map Location
                            </div>
                            <ui-radio-group
                                :items="mapLocationItems"
                                :model-value="payload.json.mapLocation"
                                two-cols
                                @update:modelValue="payload.json.mapLocation = $event as DashboardMapLocation"
                            />
                        </div>

                        <div class="dashboard-edit_row">
                            <ui-select
                                :items="mapSizeItems"
                                :model-value="payload.json.mapSize"
                                width="100%"
                                @update:modelValue="payload.json.mapSize = $event as DashboardMapSize"
                            >
                                Map Size
                            </ui-select>

                            <ui-select
                                :items="displayModeItems"
                                :model-value="payload.json.displayMode"
                                width="100%"
                                @update:modelValue="payload.json.displayMode = $event as DashboardDisplayMode"
                            >
                                Display Mode
                            </ui-select>
                        </div>

                        <ui-select
                            :items="dashboardAircraftModes"
                            :model-value="payload.json.aircraftMode ?? 'all'"
                            width="100%"
                            @update:modelValue="payload.json.aircraftMode = $event as MapAircraftMode"
                        >
                            Map aircraft
                        </ui-select>
                    </div>
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Enroute
                        </div>

                        <ui-input-text
                            :error="!!payload.json.enrouteCallsign && !enrouteCallsignValid"
                            :model-value="payload.json.enrouteCallsign ?? ''"
                            placeholder="e.g. UUWV_CTR"
                            @update:modelValue="payload.json.enrouteCallsign = ($event ?? '').toUpperCase() || null"
                        >
                            Position Callsign
                        </ui-input-text>
                        <div class="dashboard-edit_hint">
                            Setting a callsign adds the Enroute category to this dashboard.
                        </div>

                        <div
                            v-if="payload.json.enrouteCallsign"
                            class="dashboard-edit_row"
                        >
                            <ui-input-number
                                :input-attrs="{ min: 0, max: 999 }"
                                :model-value="payload.json.enrouteFlightLevel?.from ?? null"
                                placeholder="From"
                                @update:modelValue="updateFlightLevel('from', $event)"
                            >
                                Flight Level From
                            </ui-input-number>
                            <ui-input-number
                                :input-attrs="{ min: 0, max: 999 }"
                                :model-value="payload.json.enrouteFlightLevel?.to ?? null"
                                placeholder="To"
                                @update:modelValue="updateFlightLevel('to', $event)"
                            >
                                Flight Level To
                            </ui-input-number>
                        </div>
                        <div
                            v-if="flError"
                            class="dashboard-edit_error"
                        >
                            {{ flError }}
                        </div>
                    </div>
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Traffic prediction
                        </div>

                        <div class="dashboard-edit_row">
                            <ui-input-number
                                v-model="predictedWindow.binSize"
                                :input-attrs="{ min: 1, max: 60, step: 1 }"
                            >
                                Arrival interval (minutes)
                            </ui-input-number>
                            <ui-input-number
                                v-model="predictedWindow.windowMinutes"
                                :input-attrs="{ min: 15, max: 480, step: 15 }"
                            >
                                Window range (minutes)
                            </ui-input-number>
                        </div>
                        <div class="dashboard-edit_row">
                            <ui-input-number
                                v-model="predictedWindow.warningThreshold"
                                :input-attrs="{ min: 0, step: 1 }"
                            >
                                Caution threshold (arrivals)
                            </ui-input-number>
                            <ui-input-number
                                v-model="predictedWindow.alertThreshold"
                                :input-attrs="{ min: 0, step: 1 }"
                            >
                                Alert threshold (arrivals)
                            </ui-input-number>
                        </div>
                        <div class="dashboard-edit_row">
                            <ui-input-number
                                v-model="predictedWindow.yMaxOverride"
                                :input-attrs="{ min: 0, step: 1 }"
                            >
                                Chart Y-axis maximum (0 = automatic)
                            </ui-input-number>
                            <ui-toggle
                                v-model="predictedWindow.stacked"
                            >
                                Stacked columns
                            </ui-toggle>
                        </div>
                    </div>
                </div>
            </div>

            <ui-notification
                v-if="serverError"
                class="dashboard-edit_server-error"
                type="error"
            >
                {{ serverError }}
            </ui-notification>
        </div>

        <template #actions>
            <ui-button
                :disabled="saving"
                type="secondary"
                @click="model = false"
            >
                Cancel
            </ui-button>
            <ui-button
                v-if="editDashboard"
                :disabled="saving"
                type="destructive"
                @click="deleteCurrentDashboard()"
            >
                Delete
            </ui-button>
            <ui-button
                :disabled="!canSave"
                @click="save()"
            >
                {{ isEdit ? 'Save' : 'Create' }}
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import * as v from 'valibot';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import PlusIcon from '@/assets/icons/kit/plus.svg?component';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import { useDataStore } from '~/composables/render/storage';
import { hexToRgb, rgbToHex } from '~/composables/settings/colors';
import { createDashboard, deleteDashboard, updateDashboard } from '~/composables/fetchers/dashboards';
import {
    DashboardSchema,
    MAX_DASHBOARD_AIRPORTS,
    dashboardColumnLabels,
    dashboardColumns,
    dashboardAircraftModes,
    dashboardDisplayModes,
    dashboardMapLocations,
    dashboardMapSizes,
    dashboardPredictedDefaults,
    enrouteCallsignSchema,
    icaoSchema,
} from '~/utils/shared/dashboard';
import type { MapAircraftMode } from '~/types/map';
import type {
    DashboardColumn,
    DashboardDisplayMode,
    DashboardMapLocation,
    DashboardMapSize,
    DashboardPayload,
} from '~/utils/shared/dashboard';
import type { UserDashboard } from '~/utils/server/handlers/dashboards';
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';
import type { SelectItem } from '~/types/components/select';
import { VueDraggable } from 'vue-draggable-plus';
import DragIcon from '~/assets/icons/kit/drag.svg?component';

const props = defineProps({
    editDashboard: {
        type: Object as PropType<UserDashboard | null>,
        default: null,
    },
    prefillAirport: {
        type: String as PropType<string | null>,
        default: null,
    },
});

const emit = defineEmits<{ saved: [id: number] }>();

const model = defineModel({ type: Boolean, default: false });

const dataStore = useDataStore();

const isEdit = computed(() => !!props.editDashboard);

const payload = reactive<DashboardPayload>(createPayload());
const predictedWindow = computed(() => payload.json.predictedWindow!);

const saving = ref(false);
const serverError = ref<string | null>(null);
const mapLocationLabels: Record<DashboardMapLocation, string> = {
    right: 'Right of list',
    left: 'Left of list',
    above: 'Above list',
    below: 'Below list',
};
const mapLocationItems = computed<RadioItemGroup[]>(() => dashboardMapLocations.map(value => ({ value, text: mapLocationLabels[value] })));
const mapSizeItems = computed<SelectItem[]>(() => dashboardMapSizes.map(value => ({ value, text: `${ value }%` })));
const displayModeLabels: Record<DashboardDisplayMode, string> = {
    both: 'Both',
    map: 'Map Only',
    aircraft: 'Aircraft Only',
};
const displayModeItems = computed<SelectItem[]>(() => dashboardDisplayModes.map(value => ({ value, text: displayModeLabels[value] })));
const columnItems = computed<SelectItem[]>(() => dashboardColumns.map(value => ({ value, text: dashboardColumnLabels[value] })));

function hexToColorModel(hex: string | null | undefined): Partial<UserMapSettingsColor> | null {
    if (!hex) return null;
    try {
        return { color: hexToRgb(hex) };
    }
    catch {
        return null;
    }
}

function colorModelToHex(color: Partial<UserMapSettingsColor> | null): string | null {
    if (!color?.color) return null;
    const themeHex = getCurrentThemeHexColor(color.color as any);
    if (themeHex) return themeHex;
    const rgb = color.color.split(',').map(Number);
    if (rgb.length === 3 && rgb.every(component => !Number.isNaN(component))) return rgbToHex(rgb[0], rgb[1], rgb[2]);
    return null;
}

function emptyAirport(icao: string | null = null): DashboardPayload['json']['airports'][number] {
    return {
        icao: icao ?? '',
        showInTrafficPrediction: false,
        aircraftColor: null,
    };
}

const atAirportCap = computed(() => payload.json.airports.length >= MAX_DASHBOARD_AIRPORTS);

function addAirport() {
    if (atAirportCap.value) return;
    payload.json.airports.push(emptyAirport());
}

function removeAirport(index: number) {
    payload.json.airports.splice(index, 1);
    if (!payload.json.airports.length) payload.json.airports.push(emptyAirport());
}

const realIcao = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao ?? null);

function isRealIcao(icao: string) {
    const key = icao.trim().toUpperCase();
    if (!key) return false;
    if (!realIcao.value) return true;
    return !!realIcao.value[key];
}

const airportErrors = computed(() => payload.json.airports.map((airport, index) => {
    const icao = airport.icao.trim().toUpperCase();
    if (!icao) return null;
    if (!v.safeParse(icaoSchema, icao).success) return 'ICAO must be 2-4 letters or digits';
    if (!isRealIcao(icao)) return 'Unknown airport ICAO';
    const firstIndex = payload.json.airports.findIndex(other => other.icao.trim().toUpperCase() === icao);
    if (firstIndex !== index) return 'Duplicate airport';
    return null;
}));

const flError = computed(() => {
    const flightLevel = payload.json.enrouteFlightLevel;
    if (!flightLevel) return null;
    if (flightLevel.from > flightLevel.to) return 'Flight Level "From" must be lower than or equal to "To".';
    return null;
});

function updateFlightLevel(field: 'from' | 'to', value: number | null) {
    if (value === null) {
        payload.json.enrouteFlightLevel = null;
        return;
    }

    const flightLevel = payload.json.enrouteFlightLevel;
    payload.json.enrouteFlightLevel = flightLevel
        ? { ...flightLevel, [field]: value }
        : { from: value, to: value };
}

const parseResult = computed(() => v.safeParse(DashboardSchema, payload));
const nameValid = computed(() => payload.name.trim().length >= 1 && payload.name.trim().length <= 50);
const enrouteCallsignValid = computed(() => !payload.json.enrouteCallsign || v.safeParse(enrouteCallsignSchema, payload.json.enrouteCallsign).success);
const allAirportsValid = computed(() => payload.json.airports.length > 0 && airportErrors.value.every(error => !error) && payload.json.airports.every(airport => !!airport.icao.trim()));

const canSave = computed(() => !saving.value && parseResult.value.success && allAirportsValid.value);

async function save() {
    if (!canSave.value) return;

    const result = v.safeParse(DashboardSchema, payload);
    if (!result.success) return;

    saving.value = true;
    serverError.value = null;

    try {
        if (isEdit.value && props.editDashboard) {
            const { id } = await updateDashboard(props.editDashboard.id, result.output);
            emit('saved', id);
        }
        else {
            const { id } = await createDashboard(result.output);
            emit('saved', id);
        }
        model.value = false;
    }
    catch (error: any) {
        serverError.value = error?.data?.data ?? error?.statusMessage ?? 'Failed to save dashboard. Please try again.';
    }
    finally {
        saving.value = false;
    }
}

async function deleteCurrentDashboard() {
    const result = confirm(`Do you really want to delete ${ props.editDashboard?.name } dashboard? This action is irreversible`);
    if (!result) return;

    saving.value = true;
    serverError.value = null;

    try {
        await deleteDashboard(props.editDashboard?.id ?? 0);
        model.value = false;
        location.href = '/dashboard';
    }
    catch (error: any) {
        serverError.value = error?.data?.data ?? error?.statusMessage ?? 'Failed to delete dashboard. Please try again.';
    }
    finally {
        saving.value = false;
    }
}

function createPayload(dashboard: UserDashboard | null = null): DashboardPayload {
    if (!dashboard) {
        return {
            name: '',
            public: false,
            json: {
                airports: [emptyAirport(props.prefillAirport)],
                mapLocation: 'right',
                enrouteCallsign: null,
                enrouteFlightLevel: null,
                mapSize: 100,
                displayMode: 'both',
                showMetar: true,
                showArrivalTracks: true,
                openColumns: [...dashboardColumns],
                predictedWindow: { ...dashboardPredictedDefaults },
                aircraftMode: 'all',
            },
        };
    }

    const json = dashboard.json;
    return {
        name: dashboard.name,
        public: dashboard.public,
        json: {
            ...json,
            airports: json.airports.length
                ? json.airports.map(airport => ({
                    icao: airport.icao,
                    showInTrafficPrediction: airport.showInTrafficPrediction ?? false,
                    aircraftColor: airport.aircraftColor ?? null,
                }))
                : [emptyAirport()],
            mapLocation: json.mapLocation ?? 'right',
            enrouteCallsign: json.enrouteCallsign ?? null,
            enrouteFlightLevel: json.enrouteFlightLevel ?? null,
            mapSize: json.mapSize ?? 100,
            displayMode: json.displayMode ?? 'both',
            showMetar: json.showMetar ?? true,
            showArrivalTracks: json.showArrivalTracks ?? true,
            openColumns: json.openColumns ? [...json.openColumns] : [...dashboardColumns],
            predictedWindow: {
                ...dashboardPredictedDefaults,
                ...json.predictedWindow,
            },
            aircraftMode: json.aircraftMode ?? 'all',
        },
    };
}

function resetForm() {
    serverError.value = null;
    Object.assign(payload, createPayload(props.editDashboard));
}

watch(model, open => {
    if (open) resetForm();
});
</script>

<style scoped lang="scss">
.dashboard-edit {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &_top {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    &_cols {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        align-items: start;

        @include mobileOnly {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    &_col {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
    }

    &_section {
        display: flex;
        flex-direction: column;
        gap: 12px;

        padding-top: 16px;
        border-top: 1px solid $darkGray800;

        &_title {
            font-size: 16px;
            font-weight: 600;
            color: $lightGray200;
        }
    }

    &_field {
        display: flex;
        flex-direction: column;
        gap: 12px;

        &_label {
            font-size: 14px;
            font-weight: 600;
        }
    }

    &_row {
        display: flex;
        gap: 12px;

        >* {
            flex: 1 1 0;
            min-width: 0;
        }

        @include mobileOnly {
            flex-direction: column;
        }
    }

    &_airports {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    &_airport {
        display: flex;
        flex-direction: column;
        gap: 12px;

        padding: 12px;
        border: 1px solid $darkGray800;
        border-radius: 8px;

        background: $darkGray900;

        &_head {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        &_remove {
            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 16px;
            min-width: 16px;

            color: $lightGray500;

            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $red500;
                }
            }
        }

        &_drag {
            cursor: grab;
            width: 32px;
        }
    }

    &_hint {
        font-size: 13px;
        color: $lightGray500;
    }

    &_error {
        font-size: 13px;
        color: $red500;
    }

    & &_server-error {
        display: inline-flex;
    }
}
</style>
