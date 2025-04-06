<template>
    <div class="debug __info-sections">
        <map-filters-debug-clear data="all">
            Clear All
        </map-filters-debug-clear>
        <common-block-title remove-margin>
            Fake ATC
        </common-block-title>
        <common-button @click="activeController = getDefaultController()">
            Add New
        </common-button>
        <div class="debug_atc">
            <div
                v-for="(controller, index) in controllers"
                :key="controller.cid+index"
                class="debug_atc_item"
            >
                <div class="debug_atc_item_title">
                    {{controller.name}}
                </div>
                <div class="debug_atc_item_actions">
                    <common-button
                        icon-width="12px"
                        size="S"
                        @click="activeController = { ...controller }"
                    >
                        <template #icon>
                            <edit-icon/>
                        </template>
                    </common-button>
                    <common-button
                        hover-color="error700"
                        icon-width="12px"
                        primary-color="error500"
                        size="S"
                        @click="deleteController(controller.cid)"
                    >
                        <template #icon>
                            <close-icon/>
                        </template>
                    </common-button>
                </div>
            </div>
        </div>
        <common-popup
            :model-value="!!activeController"
            @update:modelValue="activeController = null"
        >
            <template #title>
                Fake ATC edit
            </template>
            <map-filters-debug-controller
                v-if="activeController"
                v-model="activeController"
            />
            <template #actions>
                <common-button
                    type="secondary"
                    @click="activeController = null"
                >
                    Cancel
                </common-button>
                <common-button
                    :disabled="!activeController!.callsign || !activeController!.name"
                    @click="saveController"
                >
                    Save
                </common-button>
            </template>
        </common-popup>
        <common-block-title remove-margin>
            Data
        </common-block-title>
        <div  class="debug_data-container __info-sections">
            <div
                v-for="key in ['vatspy', 'simaware', 'vatglasses'] as DataKey[]"
                :key
                class="debug_data __info-sections"
            >
                <div class="debug_data_title">
                    {{key}}
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
                    <common-button
                        :disabled="isDisabledSave(key)"
                        size="S"
                        @click="send(key)"
                    >
                        Save
                    </common-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { VatsimController } from '~/types/data/vatsim';
import MapFiltersDebugController from '~/components/map/filters/debug/MapFiltersDebugController.vue';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';

const files = reactive({
    vatspy: {
        json: null as File | null,
        dat: null as File | null,
    },
    simaware: null as File | null,
    vatglasses: null as File | null,
});

export interface VatsimControllerWithField extends VatsimController {
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

const { data: controllers, refresh } = await useAsyncData('debug-controllers', () => $fetch<VatsimControllerWithField[]>('/api/data/custom/controllers'), { deep: true });

const activeController = ref<VatsimControllerWithField | null>(null);
const saveController = async () => {
    await $fetch('/api/data/custom/controllers', {
        body: [
            {
                ...activeController.value!,
                default: false,
                text_atis: activeController.value!.text_atis!.filter(x => !!x),
            },
            ...controllers.value!.filter(x => x.cid !== activeController.value!.cid),
        ],
        method: 'POST',
    });
    activeController.value = null;
    await refresh();
};
const deleteController = async (cid: number) => {
    await $fetch('/api/data/custom/controllers', {
        body: controllers.value!.filter(x => x.cid !== cid),
        method: 'POST',
    });
    activeController.value = null;
    await refresh();
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

        &-container {
            display: grid;
            grid-template-areas:
                "full full"
                "left right";
        }

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
            font-family: $openSansFont;
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
}
</style>
