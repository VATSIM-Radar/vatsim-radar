<template>
    <popup-fullscreen
        v-model="model"
        :disabled="saving"
        width="700px"
    >
        <template #title>
            {{ isEdit ? 'Edit Dashboard' : 'Create Dashboard' }}
        </template>

        <div class="dashboard-edit">
            <div class="dashboard-edit_top">
                <ui-input-text
                    v-model="name"
                    :error="!!name && !nameValid"
                    :max="50"
                    placeholder="Dashboard name"
                >
                    Name
                </ui-input-text>
                <ui-toggle v-model="isPublic">
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

                        <ui-toggle v-model="showMetar">
                            Show METAR window
                        </ui-toggle>
                        <ui-toggle v-model="showArrivalTracks">
                            Show Arrival Tracks
                        </ui-toggle>

                        <ui-select
                            :items="columnItems"
                            :model-value="openColumns"
                            multiple
                            placeholder="Select columns"
                            width="100%"
                            @update:modelValue="openColumns = $event as DashboardColumn[]"
                        >
                            Open columns by default
                        </ui-select>
                    </div>
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Airports
                        </div>

                        <div class="dashboard-edit_airports">
                            <div
                                v-for="(airport, index) in airports"
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
                                        v-if="airports.length > 1"
                                        class="dashboard-edit_airport_remove"
                                        @click="removeAirport(index)"
                                    >
                                        <close-icon/>
                                    </div>
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
                                    :model-value="airport.color"
                                    @update:modelValue="airport.color = $event"
                                >
                                    Aircraft color
                                </ui-input-color>
                            </div>
                        </div>

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
                                :model-value="mapLocation"
                                two-cols
                                @update:modelValue="mapLocation = $event as DashboardMapLocation"
                            />
                        </div>

                        <div class="dashboard-edit_row">
                            <ui-select
                                :items="mapSizeItems"
                                :model-value="mapSize"
                                width="100%"
                                @update:modelValue="mapSize = $event as DashboardMapSize"
                            >
                                Map Size
                            </ui-select>

                            <ui-select
                                :items="displayModeItems"
                                :model-value="displayMode"
                                width="100%"
                                @update:modelValue="displayMode = $event as DashboardDisplayMode"
                            >
                                Display Mode
                            </ui-select>
                        </div>
                    </div>
                    <div class="dashboard-edit_section">
                        <div class="dashboard-edit_section_title">
                            Enroute
                        </div>

                        <ui-input-text
                            :error="!!enrouteCallsign && !enrouteCallsignValid"
                            :model-value="enrouteCallsign"
                            placeholder="e.g. UUWV_CTR"
                            @update:modelValue="enrouteCallsign = ($event ?? '').toUpperCase()"
                        >
                            Position Callsign
                        </ui-input-text>
                        <div class="dashboard-edit_hint">
                            Setting a callsign adds the Enroute category to this dashboard.
                        </div>

                        <div
                            v-if="enrouteCallsign.trim()"
                            class="dashboard-edit_row"
                        >
                            <ui-input-number
                                v-model="flFrom"
                                :input-attrs="{ min: 0, max: 999 }"
                                placeholder="From"
                            >
                                Flight Level From
                            </ui-input-number>
                            <ui-input-number
                                v-model="flTo"
                                :input-attrs="{ min: 0, max: 999 }"
                                placeholder="To"
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
import { createDashboard, updateDashboard } from '~/composables/fetchers/dashboards';
import {
    DashboardSchema,
    MAX_DASHBOARD_AIRPORTS,
    dashboardColumnLabels,
    dashboardColumns,
    dashboardDisplayModes,
    dashboardMapLocations,
    dashboardMapSizes,
    enrouteCallsignSchema,
    icaoSchema,
} from '~/utils/shared/dashboard';
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

interface AirportRow {
    icao: string;
    showInTrafficPrediction: boolean;
    color: Partial<UserMapSettingsColor> | null;
}

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

const name = ref('');
const isPublic = ref(false);
const airports = ref<AirportRow[]>([emptyAirport()]);
const mapLocation = ref<DashboardMapLocation>('right');
const enrouteCallsign = ref('');
const flFrom = ref<number | null>(null);
const flTo = ref<number | null>(null);
const mapSize = ref<DashboardMapSize>(100);
const displayMode = ref<DashboardDisplayMode>('both');
const showMetar = ref(true);
const showArrivalTracks = ref(true);
const openColumns = ref<DashboardColumn[]>([...dashboardColumns]);

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

function emptyAirport(icao: string | null = null): AirportRow {
    return {
        icao: icao ?? '',
        showInTrafficPrediction: false,
        color: null,
    };
}

const atAirportCap = computed(() => airports.value.length >= MAX_DASHBOARD_AIRPORTS);

function addAirport() {
    if (atAirportCap.value) return;
    airports.value.push(emptyAirport());
}

function removeAirport(index: number) {
    airports.value.splice(index, 1);
    if (!airports.value.length) airports.value.push(emptyAirport());
}

const realIcao = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao ?? null);

function isRealIcao(icao: string) {
    const key = icao.trim().toUpperCase();
    if (!key) return false;
    if (!realIcao.value) return true;
    return !!realIcao.value[key];
}

const airportErrors = computed(() => airports.value.map((airport, index) => {
    const icao = airport.icao.trim().toUpperCase();
    if (!icao) return null;
    if (!v.safeParse(icaoSchema, icao).success) return 'ICAO must be 2-4 letters or digits';
    if (!isRealIcao(icao)) return 'Unknown airport ICAO';
    const firstIndex = airports.value.findIndex(other => other.icao.trim().toUpperCase() === icao);
    if (firstIndex !== index) return 'Duplicate airport';
    return null;
}));

const enrouteFlightLevel = computed(() => {
    if (!enrouteCallsign.value.trim()) return null;
    if (flFrom.value === null || flTo.value === null) return null;
    return { from: flFrom.value, to: flTo.value };
});

const flError = computed(() => {
    if (!enrouteCallsign.value.trim() || flFrom.value === null || flTo.value === null) return null;
    if (flFrom.value > flTo.value) return 'Flight Level "From" must be lower than or equal to "To".';
    return null;
});

const payload = computed<DashboardPayload>(() => ({
    name: name.value.trim(),
    public: isPublic.value,
    json: {
        airports: airports.value.map(airport => ({
            icao: airport.icao.trim().toUpperCase(),
            showInTrafficPrediction: airport.showInTrafficPrediction,
            aircraftColor: colorModelToHex(airport.color),
        })),
        mapLocation: mapLocation.value,
        enrouteCallsign: enrouteCallsign.value.trim() ? enrouteCallsign.value.trim().toUpperCase() : null,
        enrouteFlightLevel: enrouteFlightLevel.value,
        mapSize: mapSize.value,
        displayMode: displayMode.value,
        showMetar: showMetar.value,
        showArrivalTracks: showArrivalTracks.value,
        openColumns: openColumns.value,
    },
}));

const parseResult = computed(() => v.safeParse(DashboardSchema, payload.value));
const nameValid = computed(() => name.value.trim().length >= 1 && name.value.trim().length <= 50);
const enrouteCallsignValid = computed(() => !enrouteCallsign.value.trim() || v.safeParse(enrouteCallsignSchema, enrouteCallsign.value).success);
const allAirportsValid = computed(() => airports.value.length > 0 && airportErrors.value.every(error => !error) && airports.value.every(airport => !!airport.icao.trim()));

const canSave = computed(() => !saving.value && parseResult.value.success && allAirportsValid.value);

async function save() {
    if (!canSave.value) return;

    const result = v.safeParse(DashboardSchema, payload.value);
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

function resetForm() {
    serverError.value = null;

    const dashboard = props.editDashboard;
    if (dashboard) {
        const json = dashboard.json;
        name.value = dashboard.name;
        isPublic.value = dashboard.public;
        airports.value = json.airports.length
            ? json.airports.map(airport => ({
                icao: airport.icao,
                showInTrafficPrediction: airport.showInTrafficPrediction ?? false,
                color: hexToColorModel(airport.aircraftColor),
            }))
            : [emptyAirport()];
        mapLocation.value = json.mapLocation ?? 'right';
        enrouteCallsign.value = json.enrouteCallsign ?? '';
        flFrom.value = json.enrouteFlightLevel?.from ?? null;
        flTo.value = json.enrouteFlightLevel?.to ?? null;
        mapSize.value = json.mapSize ?? 100;
        displayMode.value = json.displayMode ?? 'both';
        showMetar.value = json.showMetar ?? true;
        showArrivalTracks.value = json.showArrivalTracks ?? true;
        openColumns.value = json.openColumns ? [...json.openColumns] : [...dashboardColumns];
        return;
    }

    name.value = '';
    isPublic.value = false;
    airports.value = [emptyAirport(props.prefillAirport)];
    mapLocation.value = 'right';
    enrouteCallsign.value = '';
    flFrom.value = null;
    flTo.value = null;
    mapSize.value = 100;
    displayMode.value = 'both';
    showMetar.value = true;
    showArrivalTracks.value = true;
    openColumns.value = [...dashboardColumns];
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
