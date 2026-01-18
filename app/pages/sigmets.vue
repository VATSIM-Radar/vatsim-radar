<template>
    <view-map
        mode="sigmets"
        @map="$emit('map', $event)"
    >
        <popup-overlay
            v-model:collapsed="collapsed"
            class="date"
            collapsible
            disabled
            max-height="100%"
            model-value
            :sections="[{ key: 'content' }]"
        >
            <template #title>
                Settings
            </template>
            <template #content>
                <div class="__info-sections">
                    <ui-radio-group
                        :items="sigmetDatesList"
                        :model-value="store.localSettings.filters?.layers?.sigmets?.activeDate ?? 'current'"
                        @update:modelValue="setUserLocalSettings({ filters: { layers: { sigmets: { activeDate: $event as string } } } })"
                    >
                        <template #label>
                            Active date
                        </template>
                    </ui-radio-group>

                    <settings-sigmets/>

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
                </div>
            </template>
        </popup-overlay>
    </view-map>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import { useStore } from '~/store';
import SettingsSigmets from '~/components/features/settings/SettingsSigmets.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { MapEvent } from '~/app.vue';

defineEmits({
    map(data: MapEvent) {
        return true;
    },
});
const config = useRuntimeConfig();
const store = useStore();
const sigmetDatesList = sigmetDates();
const collapsed = ref(useIsMobile().value);

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

    width: 250px;
    border-radius: 8px;

    &_info {
        max-width: 200px;
    }
}
</style>
