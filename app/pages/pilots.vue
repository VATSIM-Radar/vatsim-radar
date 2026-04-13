<template>
    <div class="pilots">
        <ui-page-container>
            <template #title>
                Pilots
            </template>

            <ui-toggle
                align-left
                :disabled="!store.user"
                :model-value="!!store.user?.isSup"
                @update:modelValue="setSupStatus"
            >
                I'm a supervisor
            </ui-toggle>

            <ui-toggle
                v-if="store.user?.isSup"
                v-model="militaryFilter"
                align-left
            >
                Military filter
            </ui-toggle>

            <div
                v-if="store.user?.isSup"
                class="pilots_settings"
            >
                <ui-input-text v-model="militaryRegex">
                    Remarks RegEx (i)
                </ui-input-text>
                <ui-input-number v-model="militaryGS">
                    Ground speed is more than and not CONC
                </ui-input-number>
                <ui-input-text
                    v-model="militaryAircraft"
                    placeholder="For example, su21|mi8"
                >
                    Military aircraft RegEx (i)
                </ui-input-text>
                <ui-button @click="reset()">
                    Reset to defaults
                </ui-button>
            </div>

            <ui-table
                :data="getPilots"
                :headers="[
                    { key: 'cid', name: 'CID', width: 80, sort: true },
                    { key: 'callsign', name: 'Callsign', width: 100, sort: true },
                    { key: 'name', name: 'Name', width: 120 },
                    { key: 'altitude', name: 'Alt', width: 60, sort: true },
                    { key: 'groundspeed', name: 'GS', width: 60, sort: true },
                    { key: 'aircraft', name: 'A/C', width: 70 },
                    { key: 'route', name: 'Route' },
                    { key: 'remarks', name: 'Remarks' },
                ]"
                item-key="cid"
                multiple-sort
            >
                <template #data-name="{ data }">
                    {{ parseEncoding(data) }}
                </template>
                <template #data-aircraft="{ item }">
                    {{ item.flight_plan?.aircraft_short?.split('/')[0] }}
                </template>
                <template #data-route="{ item }">
                    <div class="route">
                        {{ item.flight_plan?.route }}
                    </div>
                </template>
                <template #data-remarks="{ item }">
                    <div class="route">
                        {{ item.flight_plan?.remarks }}
                    </div>
                </template>
            </ui-table>
        </ui-page-container>
    </div>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import { parseEncoding } from '~/utils/data';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import UiTable from '~/components/ui/data/UiTable.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';

const { data: pilots, refresh } = useAsyncData('sup-pilots', () => $fetch<VatsimExtendedPilot[]>('/api/data/vatsim/data/pilots'));

const store = useStore();

const militaryFilter = useCookie<boolean>('sup-military-filter', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
    default: () => false,
});

const militaryGSDefault = 900;
const militaryRegexDefault = 'surveillance|intercept| cap |air force';
const militaryAircraftDefault = '';

const militaryGS = useCookie<number>('sup-military-gs', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
    default: () => militaryGSDefault,
});

const militaryRegex = useCookie<string>('sup-military-regex', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
    default: () => militaryRegexDefault,
});

const militaryAircraft = useCookie<string>('sup-military-aircraft-regex', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
    default: () => militaryAircraftDefault,
});

function reset() {
    militaryGS.value = militaryGSDefault;
    militaryRegex.value = militaryRegexDefault;
    militaryAircraft.value = militaryAircraftDefault;
}

const regex = computed(() => new RegExp(militaryRegex.value, 'i'));
const aircraftRegex = computed(() => !militaryAircraft.value ? null : new RegExp(militaryAircraft.value, 'i'));

const getPilots = computed(() => {
    if (!militaryFilter.value || !store.user?.isSup) return pilots.value ?? [];

    return pilots.value?.filter(x => {
        const isSupersonic = x.groundspeed > militaryGS.value && !x.flight_plan?.aircraft_short?.includes('CONC');
        const isRemark = x.flight_plan?.remarks && regex.value.test(x.flight_plan.remarks);
        const isAircraft = aircraftRegex.value && x.flight_plan?.aircraft_short && aircraftRegex.value.test(x.flight_plan?.aircraft_short);

        return isSupersonic || isRemark || isAircraft;
    }) ?? [];
});

async function setSupStatus(enabled: boolean) {
    try {
        await $fetch('/api/user/supervisor', {
            method: 'POST',
            body: {
                enabled,
            },
        });
        store.user!.isSup = enabled;
    }
    catch (e) {
        console.error(e);
        alert('You are not a supervisor, or an unknown issue has occurred');
    }
}

let interval: NodeJS.Timeout | undefined;

onMounted(() => {
    interval = setInterval(() => {
        refresh();
    }, 10000);
});

onBeforeUnmount(() => clearInterval(interval));
</script>

<style lang="scss" scoped>
.pilots {
    .route {
        line-height: 120%;
    }

    :deep(.table__row) {
        content-visibility: auto;
    }

    &_settings {
        display: flex;
        flex-direction: column;
        gap: 8px;

        margin-bottom: 8px;
        padding: 8px;
        border-radius: 8px;

        background: $darkgray850;
    }
}
</style>
