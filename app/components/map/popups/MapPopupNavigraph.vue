<template>
    <map-html-overlay
        class="navigraph-overlay"
        :settings="{ position: payload.coordinate, stopEvent: true, positioning: 'top-center' }"
        :z-index="20"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            class="navigraph"
            content-full-height
            model-value
            open-from="top-center"
            width="300px"
            @update:modelValue="$emit('close')"
        >
            <template #title>
                <span
                    v-if="natInfo"
                    class="navigraph__nat-title"
                >
                    {{ natInfo.title }}
                </span>
                <template v-else>
                    {{ getInfo?.title }}
                </template>
            </template>
            <div
                v-if="natInfo"
                class="navigraph__nat"
            >
                <ui-data-list
                    :grid-columns="2"
                    :items="natInfo.summary"
                />
                <ui-data-list-item v-if="natInfo.flightLevels">
                    <template #title>
                        Valid at
                    </template>
                    <div class="navigraph__nat_levels">
                        <ui-bubble
                            v-for="level in natInfo.flightLevels"
                            :key="level"
                            type="primary-flat"
                        >
                            {{ level }}
                        </ui-bubble>
                    </div>
                </ui-data-list-item>
                <ui-copy-info
                    v-if="natInfo.route"
                    :text="natInfo.route"
                >
                    Route
                </ui-copy-info>
            </div>
            <ui-data-list
                v-else
                :grid-columns="3"
                :items="getInfo?.items.filter(x => x.text) ?? []"
            />
        </popup-map-info>
    </map-html-overlay>
</template>

<script setup lang="ts">
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type {
    FeatureNavigraph,
} from '~/utils/map/entities';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import type { DataListItem } from '~/components/ui/data/UiDataList.vue';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import type { NavigraphGetData } from '~/utils/server/navigraph/navdata/types';
import type { VatsimNattrakClient } from '~/types/data/vatsim';

const props = defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureNavigraph>>,
        required: true,
    },
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    close() {
        return true;
    },
});

const properties = computed(() => props.payload.feature.getProperties());

const datetime = new Intl.DateTimeFormat(['ru-RU'], {
    hourCycle: getKeyedValueFromSettings('appearance.timeFormat') === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    year: 'numeric',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
});

const natInfo = computed<{ title: string; summary: DataListItem[]; flightLevels: string[] | null; route: string | null } | null>(() => {
    if (properties.value.kind !== 'nat') return null;

    const nat = properties.value as unknown as VatsimNattrakClient;
    const summary: DataListItem[] = [];

    if (nat.valid_from) summary.push({ title: 'Active from', text: `${ datetime.format(nat.valid_from) }Z` });
    if (nat.valid_to) summary.push({ title: 'Active to', text: `${ datetime.format(nat.valid_to) }Z` });
    if (nat.direction) summary.push({ title: 'Direction', text: nat.direction === 'west' ? 'West' : 'East' });

    return {
        title: properties.value.identifier ?? '',
        summary,
        flightLevels: nat.flight_levels?.length ? nat.flight_levels.map(level => `FL${ level / 100 }`) : null,
        route: nat.last_routeing ?? null,
    };
});

const { data } = await useLazyAsyncData(async () => {
    if (!properties.value.dbType || !properties.value.key || properties.value.key === 'nat') return null;

    return getNavigraphData({
        data: properties.value.dbType as any,
        key: properties.value.key,
    });
});

const getInfo = computed<{ title: string; items: DataListItem[] } | null>(() => {
    if (!data.value) return null;

    if (properties.value.dbType === 'ndb') {
        const _data = data.value as NavigraphGetData<'ndb'>;

        return {
            title: _data.navaid.ident,
            items: [
                {
                    title: 'Name',
                    text: _data.navaid.name,
                },
                {
                    title: 'DME Ident',
                    text: _data.navaid.ident,
                },
                {
                    title: 'Frequency',
                    text: `${ _data.frequency } kHz`,
                },
                {
                    title: 'Magn. Variation',
                    text: `${ _data.magneticVariation }°`,
                },
                {
                    title: 'Range',
                    text: _data.range,
                },
            ],
        };
    }
    else if (properties.value.dbType === 'vhf') {
        const _data = data.value as NavigraphGetData<'vhf'>;

        return {
            title: _data.navaid.ident,
            items: [
                {
                    title: 'Name',
                    text: _data.navaid.name,
                },
                {
                    title: 'DME Ident',
                    text: _data.navaid.ident,
                },
                {
                    title: 'Frequency',
                    text: _data.frequency,
                },
                {
                    title: 'Magn. Variation',
                    text: `${ _data.magneticVariation }°`,
                },
                {
                    title: 'Elevation',
                    text: _data.elevation,
                },
                {
                    title: 'Range',
                    text: _data.range,
                },
            ],
        };
    }
    else if (properties.value.dbType === 'airways') {
        const _data = data.value as NavigraphGetData<'airways'>;
        const waypointIndex = _data.waypoints.findIndex(x => x.identifier === properties.value.waypoint);

        const waypoint = _data.waypoints[waypointIndex] ?? null;
        const nextWaypoint = waypointIndex === -1 ? null : _data.waypoints[waypointIndex + 1];
        const prevWaypoint = waypointIndex === -1 ? null : _data.waypoints[waypointIndex - 1];

        let direction = 'No restriction';

        switch (waypoint?.direction) {
            case 'F':
                if (nextWaypoint) direction = `${ nextWaypoint.identifier }`;
                else direction = 'Forward';
                break;
            case 'B':
                if (prevWaypoint) direction = `${ prevWaypoint.identifier }`;
                else direction = 'Backwards';
                break;
        }

        return {
            title: _data.airway.identifier,
            items: [
                {
                    title: 'Inbound course',
                    text: waypoint?.inbound,
                },
                {
                    title: 'Outbound course',
                    text: waypoint?.outbound,
                },
                {
                    title: 'Minimum altitude',
                    text: waypoint?.minAlt,
                },
                {
                    title: 'Maximum altitude',
                    text: waypoint?.maxAlt,
                },
                {
                    title: 'Direction',
                    text: direction,
                },
                {
                    title: 'Level',
                    text: waypoint?.flightLevel === 'H' ? 'High' : waypoint?.flightLevel === 'L' ? 'Low' : 'Both',
                },
            ],
        };
    }
    else if (properties.value.dbType === 'holdings') {
        const _data = data.value as NavigraphGetData<'holdings'>;

        return {
            title: _data.name,
            items: [
                {
                    title: 'Max Speed',
                    text: _data.speed,
                },
                {
                    title: 'Inbound Course',
                    text: _data.inboundCourse,
                },
                {
                    title: 'Leg length',
                    text: _data.legLength,
                },
                {
                    title: 'Leg time',
                    text: _data.legTime,
                },
                {
                    title: 'Min alt.',
                    text: _data.minAlt,
                },
                {
                    title: 'Max alt.',
                    text: _data.maxAlt,
                },
                {
                    title: 'Turns',
                    text: _data.turns === 'L' ? 'Left' : 'Right',
                },
                {
                    title: 'Waypoint',
                    text: _data.waypoint?.identifier,
                },
            ],
        };
    }

    return null;
});
</script>

<style scoped lang="scss">
.navigraph {
    &__nat-title {
        color: $brandPrimary;
    }

    &__nat {
        display: flex;
        flex-direction: column;
        gap: 12px;

        &_levels {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
    }
}
</style>
