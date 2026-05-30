<template>
    <div class="ipfs-info">
        <ui-data-container>
            <template #icon>
                <plane-icon/>
            </template>

            <ui-data-list
                :grid-columns="3"
                :items="[...blocks, ...secondBlocks].map((x, index) => ({ title: x.title, text: x.value, tooltip: x.hint, tooltipWidth: '150px', tooltipLocation: 'right' }))"
            />

            <ui-data-list
                v-if="ipfs.cdmData.depInfo"
                :grid-columns="1"
                :items="[{
                    title: 'Departure info',
                    text: props.ipfs.cdmData.depInfo.split('/').join(' | '),
                }]"
            />
        </ui-data-container>

        <ui-notification
            v-if="ipfs.cdmData.reason"
            type="info"
        >
            Reason for the CTOT: {{ ipfs.cdmData.reason }}
        </ui-notification>
        <div
            v-if="store.user?.cid === props.pilot.cid.toString() && ipfs.atfcmStatus !== ViffStatus.ATC_ACTIV && !ipfs.aobt"
            class="ipfs-info_obt"
        >
            <ui-block-title
                class="ipfs-info_obt_title"
                remove-margin
            >
                Target Off-Block time

                <template #append>
                    <ui-tooltip
                        location="left"
                        width="250px"
                    >
                        <template #activator>
                            <div class="radio__hint">
                                <question-icon width="16"/>
                            </div>
                        </template>
                        OBT – Off-Blocks Time<br><br>

                        The time your aircraft is expected to be ready for start-up and pushback.
                    </ui-tooltip>
                </template>
            </ui-block-title>

            <ui-notification type="info">
                More information about your flight: <a
                    class="__link"
                    href="https://vats.im/vdgs"
                    target="_blank"
                >VDGS Panel</a>
            </ui-notification>

            <ui-notification
                v-if="props.ipfs?.atfcmStatus.startsWith('FLS')"
                type="error"
            >
                Your flight has been suspended. Please, update your OBT
            </ui-notification>

            <div class="ipfs-info__cols">
                <ui-input-number
                    v-model="hrs"
                    :input-attrs="{ max: 23, min: 0 }"
                    placeholder="HH"
                >
                    Hours
                </ui-input-number>
                <ui-input-number
                    v-model="mins"
                    :input-attrs="{ max: 59, min: 0 }"
                    placeholder="MM"
                >
                    Minutes
                </ui-input-number>
                <ui-button
                    class="ipfs-info_obt_btn"
                    :disabled="saving"
                    size="M"
                    @click="saveEstimate"
                >
                    Save
                </ui-button>
            </div>
            <ui-button
                v-if="ipfs.ctot && ipfs.atfcmStatus !== ViffStatus.REA && ipfs.cdmSts !== ViffStatus.REA"
                size="S"
                @click="readyPopup = true"
            >
                Ready now
            </ui-button>
            <ui-button
                v-else-if="ipfs.atfcmStatus === ViffStatus.REA || ipfs.cdmSts === ViffStatus.REA"
                size="S"
                type="secondary"
                @click="setReadyStatus(false)"
            >
                Not ready
            </ui-button>
        </div>
        <popup-fullscreen
            v-model="readyPopup"
            :disabled="saving"
        >
            <template #title>
                Ready now
            </template>

            This action will try to improve your CTOT.<br><br>

            To be able to proceed, you must <strong>ACKNOWLEDGE</strong> that:
            <ul>
                <li>
                    The aircraft is fully prepared for start-up
                </li>
                <li>
                    The tow truck is connected and standing by for pushback (not applicable for taxi-out positions)
                </li>
                <li>
                    All pre-departure checks are complete
                </li>
            </ul>

            Proceed only if above conditions are met.

            <template #actions>
                <ui-button
                    :disabled="saving"
                    type="secondary"
                    @click="readyPopup = false"
                >
                    Cancel that please
                </ui-button>
                <ui-button
                    :disabled="saving"
                    @click="setReadyStatus(true)"
                >
                    Set REA(DY) status
                </ui-button>
            </template>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ViffRegulationType, ViffStatus } from '~/types/data/vatsim';
import type { IpfsUser, VatsimExtendedPilot } from '~/types/data/vatsim';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiDataContainer from '~/components/ui/data/UiDataContainer.vue';
import PlaneIcon from '~/assets/icons/kit/plane.svg?component';
import QuestionIcon from '~/assets/icons/basic/question.svg?component';

const props = defineProps({
    pilot: {
        type: Object as PropType<VatsimExtendedPilot>,
        required: true,
    },
    ipfs: {
        type: Object as PropType<IpfsUser>,
        required: true,
    },
});

const emit = defineEmits({
    saved(item: IpfsUser) {
        return true;
    },
});

const store = useStore();
const readyPopup = ref(false);

interface Block {
    title: string;
    value: string;
    hint?: string;
}

const blocks = computed(() => {
    const items: Block[] = [];

    if (props.ipfs?.isCdm && (props.ipfs.cdmData.tobt || props.ipfs.obt || props.ipfs.eobt)) {
        items.push({
            title: props.ipfs.cdmData.tobt ? 'TOBT' : props.ipfs.obt ? 'OBT' : 'EOBT',
            value: `${ (props.ipfs.cdmData.tobt || props.ipfs.obt || props.ipfs.eobt).slice(0, 4) }z`,
            hint: 'Target Off-Blocks Time. The time your aircraft is expected to be ready for start-up and pushback',
        });
    }

    if (!props.ipfs?.isCdm && (props.ipfs?.obt || props.ipfs?.eobt)) {
        items.push({
            title: 'OBT',
            value: `${ (props.ipfs.obt || props.ipfs.eobt).slice(0, 4) }z`,
            hint: 'Target Off-Blocks Time. The time your aircraft is expected to be ready for start-up and pushback',
        });
    }

    if (props.ipfs?.isCdm && props.ipfs.cdmData.tsat) {
        items.push({
            title: 'TSAT',
            value: `${ props.ipfs.cdmData.tsat.slice(0, 4) }z`,
            hint: 'Target Start-Up Approval Time. The time when start-up clearance can be expected, ±5 minutes of TSAT',
        });
    }

    if (props.ipfs.ctot) {
        const hours = parseInt(props.ipfs?.ctot.slice(0, 2));
        let minutes = parseInt(props.ipfs?.ctot.slice(2, 4));
        minutes -= props.ipfs.taxi ?? 0;
        let total = (hours * 60) + minutes;
        total = (total + 1440) % 1440;

        const value = `${ ('0' + Math.floor(total / 60)).slice(-2) }${ ('0' + (total % 60)).slice(-2) }z`;

        items.push({
            title: 'CTOT',
            value,
            hint: 'Calculated Take-Off Time. The time assigned for your take-off to ensure traffic flow and airspace management',
        });
    }

    if (props.ipfs.cdmData.mostPenalisingRegulation) {
        let hint: string | undefined;
        switch (props.ipfs.cdmData.mostPenalisingRegulationType) {
            case ViffRegulationType.AD:
                hint = 'Regulation due to airport';
                break;
            case ViffRegulationType.ENR:
                hint = 'Enroute regulation';
                break;
            case ViffRegulationType.ECFMP:
                hint = 'ECFMP regulation';
                break;
        }

        items.push({
            title: 'REGUL',
            value: props.ipfs.cdmData.mostPenalisingRegulation,
            hint,
        });
    }

    return items;
});

const secondBlocks = computed(() => {
    const items: Block[] = [];

    if (status.value) {
        items.push({
            title: 'Status',
            value: status.value,
            hint: statusHint.value,
        });
    }

    if (props.ipfs.cdmSts === ViffStatus.REA && props.ipfs.atfcmStatus !== ViffStatus.REA) {
        items.push({
            title: 'Ready status',
            value: `Ready`,
        });
    }

    if (props.ipfs.aobt) {
        items.push({
            title: 'AOBT',
            value: `${ props.ipfs.aobt.slice(0, 4) }z`,
        });
    }

    return items;
});

const hrs = ref(0);
const mins = ref(0);
const saving = ref(false);

async function setReadyStatus(ready: boolean) {
    saving.value = true;
    try {
        const data = await $fetch<IpfsUser>(`/api/data/vatsim/pilot/${ props.pilot.cid }/ipfs`, {
            timeout: 1000 * 15,
            method: 'POST',
            body: {
                ready,
            },
        });

        emit('saved', data);
        readyPopup.value = false;
    }
    catch (e) {
        useRadarError(e);
    }
    saving.value = false;
}

async function saveEstimate() {
    saving.value = true;
    try {
        const data = await $fetch<IpfsUser>(`/api/data/vatsim/pilot/${ props.pilot.cid }/ipfs`, {
            timeout: 1000 * 15,
            method: 'POST',
            body: {
                obt: `${ ('0' + hrs.value).slice(-2) }${ ('0' + mins.value).slice(-2) }`,
            },
        });

        emit('saved', data);
    }
    catch (e) {
        useRadarError(e);
    }
    saving.value = false;
}

watch(() => props.ipfs?.obt, val => {
    val ||= props.ipfs?.eobt;
    if (!val) return;

    hrs.value = parseInt(val.slice(0, 2));
    mins.value = parseInt(val.slice(2, 4));
}, {
    immediate: true,
});

const status = computed(() => {
    switch (props.ipfs.atfcmStatus) {
        case ViffStatus.FLS_CDM:
        case ViffStatus.FLS_GS:
        case ViffStatus.FLS_MR:
        case ViffStatus.FLS_NRA:
            return 'Suspended';
        case ViffStatus.DES:
            return 'De-suspended';
        case ViffStatus.SRM:
            return 'Slot Revised';
        case ViffStatus.SAM:
            return 'Slot Allocated';
        case ViffStatus.ATC_ACTIV:
            return 'Departing';
        case ViffStatus.REA:
            return 'Ready';
        default:
            return '';
    }
});

const statusHint = computed(() => {
    switch (props.ipfs.atfcmStatus) {
        case ViffStatus.FLS_CDM:
            return 'Flight Suspended due to not airborne in time';
        case ViffStatus.FLS_GS:
            return 'Flight Suspended by CDM';
        case ViffStatus.FLS_MR:
            return 'Flight suspended due to mandatory route';
        case ViffStatus.FLS_NRA:
            return 'Flight suspended due to ground stop';
        case ViffStatus.DES:
            return 'Flight is De-Suspended';
        case ViffStatus.SRM:
            return 'CTOT has been updated';
        case ViffStatus.SAM:
            return 'CTOT has been allocated';
        case ViffStatus.ATC_ACTIV:
            return 'Flight is already in movement';
        default:
            return '';
    }
});
</script>

<style scoped lang="scss">
.ipfs-info {
    display: flex;
    flex-direction: column;
    gap: 8px;


    &__cols {
        display: flex;
        gap: 4px;
        align-items: flex-end;

        > * {
            flex: 1 1 0;
            width: 0;
        }
    }

    &_obt {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-left: 16px;

        &_title {
            z-index: 2;
        }

        &_btn {
            height: 44px;
        }
    }

    &__info {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: center;
    }
}
</style>
