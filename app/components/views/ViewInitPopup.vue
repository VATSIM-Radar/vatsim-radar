<template>
    <common-popup
        disabled
        :model-value="store.initStatus.status !== false"
        width="600px"
    >
        <template #title>
            VATSIM Radar initialization
        </template>
        <common-notification
            v-if="store.initStatus.navigraph === 'loading'"
            type="info"
        >
            Navigraph database is updating, this can take up to a minute...
        </common-notification>
        <div class="init-items">
            <div
                v-for="(item, key) in shownKeys"
                :key
                class="init_item"
                :class="[`init_item--status-${ itemTitle(key) }`]"
            >
                <div class="init_item_icon">
                    <check-icon v-if="store.initStatus[key] === true || store.initStatus[key] === 'notRequired'"/>
                    <close-icon v-else-if="store.initStatus[key] === 'failed'"/>
                </div>
                <div class="init_item_title">
                    {{ item?.title }}
                </div>
            </div>
        </div>
        <template
            v-if="retries"
            #actions
        >
            <common-button @click="retry">
                Retry
            </common-button>
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { VRInitStatus } from '~/store';
import type { PartialRecord } from '~/types';
import {
    checkForAirlines,
    checkForData, checkForNavigraph,
    checkForSimAware,
    checkForUpdates,
    checkForVATSpy,
    checkForVG,
} from '~/composables/init';
import CheckIcon from '@/assets/icons/kit/check.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import CommonButton from '~/components/ui/buttons/CommonButton.vue';
import CommonNotification from '~/components/ui/data/CommonNotification.vue';
import CommonPopup from '~/components/common/popup/CommonPopup.vue';

const store = useStore();

const shownKeys: PartialRecord<keyof VRInitStatus, {
    title: string;
    method: () => PromiseLike<any>;
}> = {
    updatesCheck: {
        title: 'Initialization...',
        method: checkForUpdates,
    },
    dataGet: {
        title: 'VATSIM Data',
        method: checkForData,
    },
    vatspy: {
        title: 'VATSpy Sectorization',
        method: checkForVATSpy,
    },
    simaware: {
        title: 'SimAware TRACON',
        method: checkForSimAware,
    },
    airlines: {
        title: 'Airlines and VA',
        method: checkForAirlines,
    },
    vatglasses: {
        title: 'VATGlasses',
        method: checkForVG,
    },
    navigraph: {
        title: 'Navigraph Data',
        method: checkForNavigraph,
    },
};

const itemTitle = (key: keyof VRInitStatus) => {
    switch (store.initStatus[key]) {
        case true:
            return 'success';
        case false:
            return 'init';
        case 'notRequired':
            return 'skip';
        default:
            return store.initStatus[key];
    }
};

const retries = computed(() => {
    const retries: Array<keyof VRInitStatus> = [];

    for (const _key in store.initStatus) {
        const key = _key as keyof VRInitStatus;
        if (store.initStatus[key] === 'failed') {
            retries.push(key);
        }
    }

    if (!retries.length) return null;

    return retries;
});

const retry = async () => {
    await Promise.all(retries.value?.map(x => shownKeys[x]?.method()) ?? []);
};
</script>

<style scoped lang="scss">
.init {
    &-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_item {
        display: flex;
        gap: 8px;
        align-items: center;

        padding: 8px;
        border-radius: 4px;

        font-family: $openSansFont;
        font-size: 14px;
        font-weight: 500;
        line-height: 100%;

        background: $darkgray950;

        &_icon {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 20px;
            height: 20px;
            padding: 4px;
            border: 2px solid $darkgray800;
            border-radius: 100%;

            background: $darkgray875;

            transition: 0.3s;

            svg {
                animation: 0.3s svg-appearance ease-in-out;

                @keyframes svg-appearance {
                    0% {
                        transform: scale(0);
                    }

                    100% {
                        transform: scale(1);
                    }
                }
            }
        }

        &--status-loading .init_item_icon {
            border-color: $primary500;
            animation: 2s loading ease-in-out infinite;

            @keyframes loading {
                0% {
                    border-color: $primary400;
                }

                25% {
                    border-color: $primary500;
                }

                50% {
                    border-color: $primary600;
                }

                75% {
                    border-color: $primary500;
                }

                100% {
                    border-color: $primary400;
                }
            }
        }

        &--status-skip .init_item_icon {
            border-color: varToRgba('primary500', 0.6);
            color: $lightgray125Orig;
            background: varToRgba('primary500', 0.3);
        }

        &--status-success .init_item_icon {
            border-color: varToRgba('success500', 0.6);
            color: $lightgray125Orig;
            background: varToRgba('success500', 0.3);
        }

        &--status-failed .init_item_icon {
            border-color: varToRgba('error500', 0.6);
            color: $lightgray125Orig;
            background: varToRgba('error500', 0.3);
        }
    }
}
</style>
