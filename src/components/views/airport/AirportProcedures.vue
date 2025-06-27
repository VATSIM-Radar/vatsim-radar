<template>
    <div
        v-if="procedures && selectedAirport && (procedures.sids || procedures.stars || procedures.approaches)"
        class="procedures __info-sections"
    >
        <common-toggle
            v-if="from === 'airportOverlay'"
            v-model="multiple"
        >
            Multiple
        </common-toggle>
        <common-button
            v-if="multiple"
            size="S"
            type="secondary-875"
            @click="delete dataStore.navigraphProcedures[props.airport]"
        >
            Reset all
        </common-button>
        <div class="procedures_runways">
            <common-block-title>
                Runway selection
            </common-block-title>
            <div class="procedures__items">
                <div
                    v-for="runway in runways"
                    :key="runway"
                    class="procedures__items_item"
                    :class="{ 'procedures__items_item--active': selectedAirport.runways.includes(runway) }"
                    @click="selectItem('runway', runway)"
                >
                    {{runway}}
                </div>
            </div>
        </div>
        <template
            v-for="(type, key) in proceduresTypes"
            :key
        >
            <template v-if="!flightType || (flightType === 'departure' ? key === 'sids' : key !== 'sids')">
                <common-button
                    v-if="multiple && key !== 'approaches'"
                    :disabled="!selectedAirport.runways.length"
                    size="S"
                    @click="selectAll(key)"
                >
                    Select all {{type.title}}
                </common-button>
                <div
                    v-if="procedures[key]?.length"
                    class="procedures_group __info-sections"
                >
                    <common-block-title remove-margin>
                        {{type.title}}
                    </common-block-title>
                    <div class="procedures__items">
                        <div
                            v-for="(item, index) in procedures[key]"
                            :key="type.key(item as any)"
                            class="procedures__items_item"
                            :class="{
                                'procedures__items_item--blurred': type.isBlurred(item as any),
                                'procedures__items_item--active': selectedAirport[key][type.key(item as any)],
                            }"
                            @click="selectItem(key, index)"
                        >
                            <template v-if="isApproach(item)">
                                {{item.name}} RWY {{item.runway}}
                            </template>
                            <template v-else>
                                {{item.identifier}}
                            </template>
                        </div>
                    </div>
                </div>
                <div
                    v-for="(selection, index) in transitionsList[key]"
                    :key="index"
                    class="procedures_group __info-sections"
                >
                    <common-block-title remove-margin>
                        <template v-if="multiple">
                            {{ 'procedureName' in selection.procedure.procedure ? `${ selection.procedure.procedure.procedureName } ${ selection.procedure.procedure.runway }` : selection.procedure.procedure.identifier }} Transitions
                        </template>
                        <template v-else>
                            {{ type.title }} Transition
                        </template>
                    </common-block-title>
                    <div class="procedures__items">
                        <div
                            v-for="item in ('enroute' in selection.procedure.transitions ? selection.procedure.transitions.enroute : selection.procedure.transitions)"
                            :key="item.name"
                            class="procedures__items_item"
                            :class="{ 'procedures__items_item--active': selection.transitions.includes(item.name) }"
                            @click="selectTransition(selection, item.name)"
                        >
                            {{item.name}}
                        </div>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import {
    getNavigraphAirportProceduresForKey,
    getNavigraphAirportProcedure,
    getNavigraphAirportProcedures, enroutePath,
} from '#imports';
import type { DataStoreNavigraphProcedure, DataStoreNavigraphProceduresAirport } from '#imports';
import type { IDBNavigraphProcedures } from '~/utils/client-db';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { NavigraphNavDataApproach, NavigraphNavDataStar } from '~/utils/backend/navigraph/navdata/types';

const props = defineProps({
    airport: {
        type: String,
        required: true,
    },
    from: {
        type: String as PropType<DataStoreNavigraphProceduresAirport['setBy']>,
        required: true,
    },
    aircraft: {
        type: Object as PropType<VatsimShortenedAircraft | null>,
        default: null,
    },
    flightType: {
        type: String as PropType<'departure' | 'arrival' | null>,
        default: null,
    },
});

const { data: procedures } = await useAsyncData(computed(() => `${ props.airport }-procedures`), () => getNavigraphAirportProcedures(props.airport));

if (!procedures.value) {
    procedures.value = {
        sids: [],
        stars: [],
        approaches: [],
    };
}

const dataStore = useDataStore();

const multiple = useCookie<boolean>('navdata-multiple', {
    path: '/',
    secure: true,
    sameSite: 'none',
});

interface ProcedureType<T extends keyof IDBNavigraphProcedures> {
    title: string;
    key: (item: IDBNavigraphProcedures[T][0]) => string;
    isBlurred: (item: IDBNavigraphProcedures[T][0]) => boolean;
}

const proceduresTypes: {
    sids: ProcedureType<'sids'>;
    stars: ProcedureType<'stars'>;
    approaches: ProcedureType<'approaches'>;
} = {
    sids: {
        title: 'SIDs',
        key: item => item.identifier,
        isBlurred: item => !!selectedAirport.value!.runways.length && item.runways !== null && !item.runways.some(x => x === null || selectedAirport.value!.runways.includes(x)),
    },
    stars: {
        title: 'STARs',
        key: item => item.identifier,
        isBlurred: item => !!selectedAirport.value!.runways.length && item.runways !== null && !item.runways.some(x => x === null || selectedAirport.value!.runways.includes(x)),
    },
    approaches: {
        title: 'Approaches',
        key: item => `${ item.name }-${ item.runway }`,
        isBlurred: item => !!selectedAirport.value!.runways.length && !selectedAirport.value!.runways.includes(item.runway),
    },
};

const approachKey = (item: IDBNavigraphProcedures['approaches'][0]) => proceduresTypes.approaches.key(item);

function isApproach(item: IDBNavigraphProcedures[keyof IDBNavigraphProcedures][0]): item is IDBNavigraphProcedures['approaches'][0] {
    return 'name' in item;
}

const runways = computed(() => {
    const list = new Set<string>();

    procedures.value!.sids?.forEach(x => x.runways?.forEach(x => x && list.add(x)));
    procedures.value!.stars?.forEach(x => x.runways?.forEach(x => x && list.add(x)));
    procedures.value!.approaches?.forEach(x => list.add(x.runway));

    return Array.from(list).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
});

const selectedAirport = computed({
    get: () => {
        if (props.from === 'pilotOverlay') {
            if (props.flightType === 'departure') return dataStore.navigraphAircraftProcedures.value[props.aircraft!.cid.toString()]?.departure;
            else return dataStore.navigraphAircraftProcedures.value[props.aircraft!.cid.toString()]?.arrival;
        }

        return dataStore.navigraphProcedures[props.airport];
    },
    set: val => {
        if (!val) return;

        if (props.from === 'pilotOverlay') {
            dataStore.navigraphAircraftProcedures.value[props.aircraft!.cid.toString()] ||= {
                departure: {
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: props.from,
                },
                arrival: {
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: props.from,
                },
            };

            if (props.flightType === 'departure') {
                dataStore.navigraphAircraftProcedures.value[props.aircraft!.cid.toString()].departure = val;
            }
            else {
                dataStore.navigraphAircraftProcedures.value[props.aircraft!.cid.toString()].arrival = val;
            }

            dataStore.navigraphWaypoints.value[props.aircraft!.cid.toString()].waypoints = [];
            triggerRef(dataStore.navigraphAircraftProcedures);

            return;
        }

        dataStore.navigraphProcedures[props.airport] = val;
    },
});

function selectTransition(selection: DataStoreNavigraphProcedure<NavigraphNavDataStar> | DataStoreNavigraphProcedure<NavigraphNavDataApproach>, name: string) {
    if (selection.transitions.includes(name)) {
        selection.transitions = selection.transitions.filter(x => x !== name);
    }
    else {
        if (multiple.value) {
            selection.transitions = [...selection.transitions, name];
        }
        else {
            selection.transitions = [name];
        }
    }

    triggerRef(selectedAirport);
}

async function selectItem(type: 'runway', value: string | null): Promise<void>;
async function selectItem(type: keyof IDBNavigraphProcedures, value: number | null): Promise<void>;
async function selectItem(type: 'runway' | keyof IDBNavigraphProcedures, value: string | number | null): Promise<void> {
    if (!selectedAirport.value) return;

    if (type === 'runway') {
        if (!value || selectedAirport.value.runways.includes(value as string)) selectedAirport.value.runways = [];
        else if (!multiple.value) selectedAirport.value.runways = [value as string];
        else selectedAirport.value.runways.push(value as string);
    }
    else {
        if (value === null) selectedAirport.value[type] = {};
        else if (type !== 'approaches') {
            const procedure = procedures.value?.[type][value as number];

            if (procedure) {
                const data = await getNavigraphAirportProcedure(type, props.airport, value as number);

                if (data) {
                    if (selectedAirport.value[type][procedure.identifier]) delete selectedAirport.value[type][procedure.identifier];
                    else {
                        if (!multiple.value) selectedAirport.value[type] = {};
                        selectedAirport.value[type][procedure.identifier] = {
                            constraints: true,
                            transitions: [],
                            procedure: data,
                        };
                    }
                }
            }
        }
        else {
            const procedure = procedures.value?.approaches[value as number];

            if (procedure) {
                const data = await getNavigraphAirportProcedure('approaches', props.airport, value as number);

                if (data) {
                    const key = approachKey(procedure);
                    if (selectedAirport.value.approaches[key]) delete selectedAirport.value.approaches[key];
                    else {
                        if (!multiple.value) selectedAirport.value.approaches = {};
                        selectedAirport.value.approaches[key] = {
                            constraints: true,
                            transitions: [],
                            procedure: data,
                        };

                        if (!multiple.value) {
                            const selectedStar = Object.values(selectedAirport.value.stars)[0];

                            const waypoint = selectedStar && selectedStar.procedure.waypoints[selectedStar.procedure.waypoints.length - 1]?.identifier;
                            if (data.transitions.some(x => x.name === waypoint)) selectedAirport.value.approaches[key].transitions.push(waypoint);
                        }
                    }
                }
            }
        }
    }

    triggerRef(selectedAirport);
}

const transitionsList = computed(() => {
    const sids = Object.values(selectedAirport.value!.sids);
    const stars = Object.values(selectedAirport.value!.stars);
    const approaches = Object.values(selectedAirport.value!.approaches);

    return {
        sids: sids.filter((x, index) => x.procedure.transitions.enroute.length > 1 && !sids.some((y, yIndex) => yIndex < index && JSON.stringify(y.procedure.transitions.enroute) === JSON.stringify(x.procedure.transitions.enroute))),
        stars: stars.filter((x, index) => x.procedure.transitions.enroute.length > 1 && !stars.some((y, yIndex) => yIndex < index && JSON.stringify(y.procedure.transitions.enroute) === JSON.stringify(x.procedure.transitions.enroute))),
        approaches: approaches.filter((x, index) => x.procedure.transitions.length > 1 && !approaches.some((y, yIndex) => yIndex < index && JSON.stringify(y.procedure.transitions) === JSON.stringify(x.procedure.transitions))),
    };
});

function setAirport() {
    if (!selectedAirport.value) {
        selectedAirport.value = {
            sids: {},
            stars: {},
            approaches: {},
            runways: [],
            setBy: props.from,
        };
    }
}

async function selectAll(key: 'sids' | 'stars') {
    if (key === 'sids') {
        const sids = await getNavigraphAirportProceduresForKey('sids', props.airport);

        selectedAirport.value!.sids = {
            ...selectedAirport.value!.sids,
            ...Object.fromEntries(Object.values(procedures.value!.sids).filter(x => !proceduresTypes.sids.isBlurred(x)).map(item => [item.identifier, {
                constraints: true,
                transitions: [],
                procedure: sids.find(x => x.procedure.identifier === item.identifier)!,
            }])),
        };

        transitionsList.value.sids.forEach(x => x.transitions = x.procedure.transitions.enroute.map(x => x.name));
    }
    else {
        const stars = await getNavigraphAirportProceduresForKey('stars', props.airport);

        selectedAirport.value!.stars = {
            ...selectedAirport.value!.stars,
            ...Object.fromEntries(Object.values(procedures.value!.stars).filter(x => !proceduresTypes.stars.isBlurred(x)).map(item => [item.identifier, {
                constraints: true,
                transitions: [],
                procedure: stars.find(x => x.procedure.identifier === item.identifier)!,
            }])),
        };

        transitionsList.value.stars.forEach(x => x.transitions = x.procedure.transitions.enroute.map(x => x.name));
    }
}

watch(selectedAirport, () => {
    setAirport();
    dataStore.navigraphWaypoints.value = {};

    if (selectedAirport.value) {
        if (props.from === 'pilotOverlay') {
            enrouteAircraftPath.value ||= {};
            enrouteAircraftPath.value[props.aircraft!.cid] ||= {
                departure: {
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: props.from,
                },
                arrival: {
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: props.from,
                },
            };

            enrouteAircraftPath.value[props.aircraft!.cid][props.flightType === 'departure' ? 'departure' : 'arrival'] = {
                icao: props.airport,
                runways: selectedAirport.value.runways,
                sids: Object.fromEntries(Object.entries(selectedAirport.value.sids).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                stars: Object.fromEntries(Object.entries(selectedAirport.value.stars).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                approaches: Object.fromEntries(Object.entries(selectedAirport.value.approaches).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                setBy: selectedAirport.value.setBy,
            };

            triggerRef(enrouteAircraftPath);
        }
        else {
            enroutePath.value ||= {};

            enroutePath.value[props.airport] = {
                runways: selectedAirport.value.runways,
                sids: Object.fromEntries(Object.entries(selectedAirport.value.sids).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                stars: Object.fromEntries(Object.entries(selectedAirport.value.stars).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                approaches: Object.fromEntries(Object.entries(selectedAirport.value.approaches).map(([key, value]) => [key, { constraints: value.constraints, transitions: value.transitions }])),
                setBy: selectedAirport.value.setBy,
            };

            triggerRef(enroutePath);
        }
    }
}, {
    immediate: true,
    deep: 4,
});

onMounted(async () => {
    setAirport();
});
</script>

<style scoped lang="scss">
.procedures {
    &__items {
        resize: vertical;

        overflow: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-start;

        max-height: 120px;

        &_item {
            cursor: pointer;
            user-select: none;

            padding: 4px 8px;
            border: 1px solid varToRgba('lightgray125', 0.15);
            border-radius: 4px;

            font-family: $openSansFont;
            font-size: 12px;
            font-weight: 600;

            background: $darkgray900;

            transition: 0.3s;

            @include hover {
                &:hover {
                    background: $darkgray850;
                }
            }

            &--blurred {
                order: 1;
                border-color: varToRgba('error300', 0.5);
            }

            &--active {
                border-color: $primary500;
            }

            &--blurred.procedures__items_item--active {
                background: varToRgba('error300', 0.3);
            }

            &:not(&--blurred) {
                order: 0;
            }
        }
    }

    &_runways .procedures__items {
        resize: none;
        height: auto;
        min-height: unset;
    }
}
</style>
