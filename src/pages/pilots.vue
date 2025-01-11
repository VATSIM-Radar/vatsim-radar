<template>
    <div class="pilots">
        <common-page-block>
            <template #title>
                Pilots
            </template>

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
                            {{ pilot.name }}
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
        </common-page-block>
    </div>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';

const { data: pilots, refresh } = useAsyncData('sup-pilots', () => $fetch<VatsimExtendedPilot[]>('/api/data/vatsim/data/pilots'));

onMounted(() => {
    const interval = setInterval(() => {
        refresh();
    }, 10000);

    onBeforeUnmount(() => clearInterval(interval));
});
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
