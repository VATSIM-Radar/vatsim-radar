<template>
    <div class="procedures __info-sections">
        <div class="procedures_runways">
            <common-block-title>
                Runway selection
            </common-block-title>
            <div class="procedures__items">
                <div
                    v-for="runway in runways"
                    :key="runway"
                    class="procedures__items_item"
                    :class="{ 'procedures__items_item--active': selections.runway === runway }"
                    @click="selections.runway === runway ? selections.runway = null : selections.runway = runway"
                >
                    {{runway}}
                </div>
            </div>
        </div>
        <div
            v-if="procedures.sids?.length"
            class="procedures_group __info-sections"
        >
            <common-block-title remove-margin>
                SIDs
            </common-block-title>
            <div class="procedures__items">
                <div
                    v-for="(item, index) in procedures.sids"
                    :key="item.identifier"
                    class="procedures__items_item"
                    :class="{
                        'procedures__items_item--blurred': selections.runway && item.runways !== null && !item.runways.some(x => x === null || x === selections.runway),
                        'procedures__items_item--active': selections.sid === index,
                    }"
                    @click="selections.sid === index ? selections.sid = null : selections.sid = index"
                >
                    {{item.identifier}}
                </div>
            </div>
            <template  v-if="selections.sid !== null && procedures.sids[selections.sid].transitions.enroute.length">
                <common-block-title remove-margin>
                    SID Transition
                </common-block-title>
                <div class="procedures__items">
                    <div
                        v-for="item in procedures.sids[selections.sid].transitions.enroute"
                        :key="item"
                        class="procedures__items_item"
                        :class="{ 'procedures__items_item--active': selections.sidTransition === item }"
                        @click="selections.sidTransition = item"
                    >
                        {{item}}
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IDBNavigraphProcedures } from '~/utils/client-db';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { getNavigraphAirportProcedure } from '#imports';

const props = defineProps({
    procedures: {
        type: Object as PropType<IDBNavigraphProcedures>,
        required: true,
    },
    airport: {
        type: String,
        required: true,
    },
});

const dataStore = useDataStore();

const selections = reactive({
    runway: null as string | null,

    sid: null as number | null,
    sidTransition: null as string | null,

    star: null as number | null,
    starTransition: null as string | null,

    approach: null as number | null,
});

const runways = computed(() => {
    const list = new Set<string>();

    props.procedures.sids?.forEach(x => x.runways?.forEach(x => x && list.add(x)));
    props.procedures.stars?.forEach(x => x.runways?.forEach(x => x && list.add(x)));
    props.procedures.approaches?.forEach(x => list.add(x.runway));

    return Array.from(list).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
});

const selectedSid = computed(() => {
    return props.procedures.sids[selections.sid ?? -1];
});

watch(() => selections.sid, async (val, oldVal) => {
    if (oldVal !== null) delete dataStore.navigraphProcedures.sids.value[props.procedures.sids[oldVal]?.identifier];
    if (val !== null) {
        if (selectedSid.value.transitions.enroute.length === 1) {
            selections.sidTransition = selectedSid.value.transitions.enroute[0];
        }

        const procedure = await getNavigraphAirportProcedure('sids', props.airport, val);
        if (!procedure) return;

        dataStore.navigraphProcedures.sids.value[selectedSid.value.identifier] = {
            constraints: true,
            transition: selections.sidTransition,
            runway: selections.runway,
            procedure,
        };
    }
});

watch(() => selections.sidTransition, val => {
    if (selections.sid && dataStore.navigraphProcedures.sids.value[selectedSid.value.identifier]) dataStore.navigraphProcedures.sids.value[selectedSid.value.identifier].transition = val;
});

watch(() => selections.runway, val => {
    if (selections.sid && dataStore.navigraphProcedures.sids.value[selectedSid.value.identifier]) dataStore.navigraphProcedures.sids.value[selectedSid.value.identifier].runway = val;
});
</script>

<style scoped lang="scss">
.procedures {
    &__items {
        overflow: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        max-height: 150px;

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
}
</style>
