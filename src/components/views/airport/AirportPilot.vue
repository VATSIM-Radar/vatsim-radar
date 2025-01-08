<template>
    <div
        v-if="model && pilot"
        class="pilot"
    >
        <div class="pilot_header">
            <div class="pilot_header_title">
                {{ pilot.callsign }}
            </div>
            <div
                class="pilot_header_close"
                @click="model = false"
            >
                <close-icon/>
            </div>
        </div>
        <div class="pilot_sections">
            <div
                v-if="!isPrefile"
                class="pilot__section"
            >
                <common-block-title
                    v-model:collapsed="collapsedFlight"
                    class="pilot__section_title"
                >
                    Flight Details
                </common-block-title>
                <map-popup-flight-info
                    v-if="!collapsedFlight"
                    class="__info-sections"
                    :is-offline="isOffline"
                    :pilot="pilot as VatsimExtendedPilot"
                    show-stats
                />
            </div>
            <div
                v-if="pilot.flight_plan"
                class="pilot__section"
            >
                <common-block-title
                    v-model:collapsed="collapsedPlan"
                    class="pilot__section_title"
                >
                    Flight Plan
                </common-block-title>
                <map-popup-flight-plan
                    v-if="!collapsedPlan"
                    class="__info-sections"
                    :flight-plan="pilot.flight_plan"
                    :status="'status' in pilot ? pilot.status : undefined"
                    :stepclimbs="'stepclimbs' in pilot ? pilot.stepclimbs : undefined"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IFetchError } from 'ofetch';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import MapPopupFlightInfo from '~/components/map/popups/MapPopupFlightInfo.vue';
import MapPopupFlightPlan from '~/components/map/popups/MapPopupFlightPlan.vue';

const props = defineProps({
    cid: {
        type: Number,
        required: true,
    },
});

const pilot = shallowRef<VatsimExtendedPilot | VatsimPrefile>();
const dataStore = useDataStore();
const model = defineModel({ type: Boolean, default: true });
const isOffline = defineModel('offline', { type: Boolean, default: false });

const collapsedFlight = ref(false);
const collapsedPlan = ref(false);
const isPrefile = ref(false);
const loading = ref(false);

onMounted(() => {
    watch(dataStore.vatsim.updateTimestamp, async () => {
        if (loading.value) return;
        try {
            loading.value = true;
            const [pilotResult, prefileResult] = await Promise.allSettled([
                $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ props.cid }`, {
                    timeout: 1000 * 15,
                }),
                $fetch<VatsimPrefile>(`/api/data/vatsim/pilot/${ props.cid }/prefile`, {
                    timeout: 1000 * 15,
                }),
            ]);

            if (pilotResult.status === 'fulfilled') {
                pilot.value = pilotResult.value;
                isPrefile.value = false;
            }
            else if (prefileResult.status === 'fulfilled') {
                pilot.value = prefileResult.value;
                isPrefile.value = true;
            }
            else throw pilotResult.reason;

            isOffline.value = false;
        }
        catch (e: IFetchError | any) {
            if (e) {
                isOffline.value = e.status === 404;
            }
        }
        finally {
            loading.value = false;
        }
    }, {
        immediate: true,
    });
});
</script>

<style scoped lang="scss">
.pilot {
    display: flex;
    flex-direction: column;
    gap: 24px;

    padding: 16px;
    border-radius: 8px;

    background: $darkgray1000;

    &_header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: $lightgray150;

        &_title {
            font-family: $openSansFont;
            font-size: 17px;
            font-weight: 700;
            line-height: 100%;
            color: $primary500;
        }

        &_close {
            cursor: pointer;
            width: 14px;
            height: 14px;
            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $error500;
                }
            }
        }
    }

    &_sections {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
}
</style>
