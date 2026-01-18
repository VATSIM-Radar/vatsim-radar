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

            <table>
                <thead>
                    <tr>
                        <th>
                            CID
                        </th>
                        <th>
                            Callsign
                        </th>
                        <th>
                            Name
                        </th>
                        <th>
                            Altitude
                        </th>
                        <th>
                            GS
                        </th>
                        <th>
                            A/C
                        </th>
                        <th>
                            Route
                        </th>
                        <th>
                            Remarks
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="pilot in pilots"
                        :key="pilot.cid"
                    >
                        <td>
                            {{ pilot.cid }}
                        </td>
                        <td>
                            {{ pilot.callsign }}
                        </td>
                        <td>
                            {{ parseEncoding(pilot.name) }}
                        </td>
                        <td>
                            {{ pilot.altitude }}
                        </td>
                        <td>
                            {{ pilot.groundspeed }}
                        </td>
                        <td class="aircraft">
                            {{ pilot.flight_plan?.aircraft_short?.split('/')[0] }}
                        </td>
                        <td>
                            <small>
                                {{ pilot.flight_plan?.route }}
                            </small>
                        </td>
                        <td>
                            <small>
                                {{ pilot.flight_plan?.remarks }}
                            </small>
                        </td>
                    </tr>
                </tbody>
            </table>
        </ui-page-container>
    </div>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import { parseEncoding } from '~/utils/data';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';

const { data: pilots, refresh } = useAsyncData('sup-pilots', () => $fetch<VatsimExtendedPilot[]>('/api/data/vatsim/data/pilots'));

const store = useStore();

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
    table {
        border-collapse: collapse;
    }

    table, th, td {
        padding: 8px;
        border: 1px solid varToRgba('lightgray150', 0.2);
        border-radius: 8px;
    }

    thead {
        position: sticky;
        top: 55px;
        background: $darkgray1000;
    }
}
</style>
