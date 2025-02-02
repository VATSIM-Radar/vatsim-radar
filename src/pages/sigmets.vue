<template>
    <view-map sigmets-mode>
        <div class="date __info-sections">
            <div class="__partner-info date_info">
                <div class="__partner-info_image">
                    <img
                        alt="NWS"
                        src="~/assets/images/NWS-logo.svg"
                    >
                </div>
                <span>
                    Data provided by <a
                        class="__link"
                        href="https://aviationweather.gov/"
                        target="_blank"
                    >Aviation Weather Center</a>
                </span>
            </div>

            <common-radio-group
                :items="sigmetDatesList"
                :model-value="store.localSettings.filters?.layers?.sigmets?.activeDate ?? 'current'"
                @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { activeDate: $event as string } } } })"
            >
                <template #label>
                    Active date
                </template>
            </common-radio-group>
        </div>
    </view-map>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import { useStore } from '~/store';

const config = useRuntimeConfig();
const store = useStore();
const sigmetDatesList = sigmetDates();

useHead(() => ({
    title: 'SIGMETs',
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }/sigmets`,
        },
    ],
}));
</script>

<style lang="scss" scoped>
.date {
    position: absolute;
    z-index: 5;
    top: 10px;
    left: 10px;

    padding: 10px;
    border-radius: 8px;

    background: $darkgray950;

    &_info {
        max-width: 200px;
    }
}
</style>
